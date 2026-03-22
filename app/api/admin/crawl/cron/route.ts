import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { createJob, updateJob, addLog } from '@/lib/crawl-jobs'
import { getAdapterWithDbConfig, fetchUrl, countWordsInHtml } from '@/lib/crawl-adapters'
import type { ChapterRef } from '@/lib/crawl-adapters'

// This endpoint is called by a cron job or manually from admin UI
// Vercel Cron / self-hosted cron: GET /api/admin/crawl/cron?secret=...
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const now = new Date()

  // Find all active schedules that are due
  const dueShedules = await prisma.crawlSchedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { story: { select: { id: true, title: true } } },
    take: 5, // Max 5 concurrent schedules per cron run
  })

  if (dueShedules.length === 0) {
    return NextResponse.json({ message: 'No schedules due', ran: 0 })
  }

  const results = []

  for (const schedule of dueShedules) {
    // Update nextRunAt immediately to prevent double-running
    const nextRunAt = new Date(now.getTime() + schedule.intervalMinutes * 60 * 1000)
    await prisma.crawlSchedule.update({
      where: { id: schedule.id },
      data: { lastRunAt: now, nextRunAt, lastError: null },
    })

    // Create job and crawl new chapters only (from lastChapterNum + 1)
    const jobId = randomUUID()
    const fromChapter = schedule.lastChapterNum + 1
    createJob(jobId, { url: schedule.sourceUrl, fromChapter, toChapter: 9999 })

    // Run in background
    runScheduledCrawl(jobId, schedule, fromChapter).catch(async (e: any) => {
      await prisma.crawlSchedule.update({
        where: { id: schedule.id },
        data: { lastError: e?.message },
      })
    })

    results.push({ scheduleId: schedule.id, storyTitle: schedule.story.title, jobId, fromChapter })
  }

  return NextResponse.json({ message: `Triggered ${results.length} crawl(s)`, results })
}

// Also allow manual POST trigger from admin UI (no secret needed if authenticated)
export async function POST(req: NextRequest) {
  const { scheduleId } = await req.json()
  if (!scheduleId) return NextResponse.json({ error: 'Missing scheduleId' }, { status: 400 })

  const schedule = await prisma.crawlSchedule.findUnique({
    where: { id: scheduleId },
    include: { story: { select: { id: true, title: true } } },
  })
  if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })

  const jobId = randomUUID()
  const fromChapter = schedule.lastChapterNum + 1
  createJob(jobId, { url: schedule.sourceUrl, fromChapter, toChapter: 9999 })

  const now = new Date()
  const nextRunAt = new Date(now.getTime() + schedule.intervalMinutes * 60 * 1000)
  await prisma.crawlSchedule.update({
    where: { id: scheduleId },
    data: { lastRunAt: now, nextRunAt },
  })

  runScheduledCrawl(jobId, schedule, fromChapter).catch(() => {})

  return NextResponse.json({ jobId, fromChapter })
}

async function runScheduledCrawl(
  jobId: string,
  schedule: { id: string; sourceUrl: string; story: { id: string; title: string } },
  fromChapter: number
) {
  updateJob(jobId, { status: 'running' })
  addLog(jobId, `🕐 [Schedule] Crawl tự động: ${schedule.story.title}`)
  addLog(jobId, `📡 Source: ${schedule.sourceUrl}`)
  addLog(jobId, `🔢 Crawl từ chương ${fromChapter}`)

  const { adapter } = await getAdapterWithDbConfig(schedule.sourceUrl)
  addLog(jobId, `🔌 Adapter: ${adapter.name}`)

  try {
    const storyHtml = await fetchUrl(schedule.sourceUrl)
    const info = adapter.fetchStoryInfo(schedule.sourceUrl, storyHtml)

    // Collect chapters — use fetchAllChapters (AJAX pagination) if available
    let allChapters: ChapterRef[] = []
    if (adapter.fetchAllChapters) {
      addLog(jobId, `⚡ Dùng API phân trang chương (metruyenchu style)`)
      allChapters = await adapter.fetchAllChapters(schedule.sourceUrl, storyHtml)
    } else {
      let pageUrl: string | undefined = schedule.sourceUrl
      let pageCount = 0
      while (pageUrl && pageCount < 50) {
        const pageHtml = pageUrl === schedule.sourceUrl ? storyHtml : await fetchUrl(pageUrl)
        const { chapters, nextPageUrl } = adapter.fetchChapterList(pageUrl, pageHtml)
        allChapters = [...allChapters, ...chapters]
        pageUrl = nextPageUrl
        pageCount++
        if (nextPageUrl) await new Promise(r => setTimeout(r, 300))
      }
    }

    const chapterMap = new Map<number, ChapterRef>()
    for (const ch of allChapters) chapterMap.set(ch.num, ch)
    const toImport = Array.from(chapterMap.values())
      .filter(c => c.num >= fromChapter)
      .sort((a, b) => a.num - b.num)

    if (toImport.length === 0) {
      addLog(jobId, `⏭️ Không có chương mới (cuối: ch.${fromChapter - 1})`)
      updateJob(jobId, { status: 'completed', importedChapters: 0, totalChapters: 0 })
      return
    }

    addLog(jobId, `📚 Tìm thấy ${toImport.length} chương mới (ch.${toImport[0].num} → ch.${toImport[toImport.length - 1].num})`)
    updateJob(jobId, { totalChapters: toImport.length, storyTitle: schedule.story.title, storyId: schedule.story.id })

    let imported = 0
    let maxChapter = fromChapter - 1

    for (const ch of toImport) {
      try {
        const chHtml = await fetchUrl(ch.url, 12000)
        const content = adapter.fetchChapterContent(ch.url, chHtml)
        const wordCount = countWordsInHtml(content)

        if (!content || wordCount < 10) {
          addLog(jobId, `⚠️ Ch.${ch.num}: nội dung quá ngắn, bỏ qua`)
          continue
        }

        await prisma.chapter.upsert({
          where: { storyId_chapterNum: { storyId: schedule.story.id, chapterNum: ch.num } },
          update: { content, wordCount, title: ch.title || null },
          create: {
            storyId: schedule.story.id, chapterNum: ch.num,
            title: ch.title || null, content, wordCount,
            isLocked: false, coinCost: 0,
          },
        })

        imported++
        maxChapter = Math.max(maxChapter, ch.num)
        updateJob(jobId, { importedChapters: imported })

        if (imported % 3 === 0 || imported === 1) {
          addLog(jobId, `✅ ${imported}/${toImport.length}: ch.${ch.num} (${wordCount} chữ)`)
        }

        await new Promise(r => setTimeout(r, 800)) // Slower for auto-crawl to be polite
      } catch (e: any) {
        addLog(jobId, `❌ Ch.${ch.num}: ${e?.message}`)
      }
    }

    // Update lastChapterNum
    if (maxChapter > fromChapter - 1) {
      await prisma.crawlSchedule.update({
        where: { id: schedule.id },
        data: { lastChapterNum: maxChapter },
      })
    }

    // Update story status if changed
    if (info.status && info.status !== 'ONGOING') {
      await prisma.story.update({
        where: { id: schedule.story.id },
        data: { status: info.status as any },
      })
    }

    addLog(jobId, `🎉 Hoàn thành! Import ${imported}/${toImport.length} chương mới`)
    updateJob(jobId, { status: 'completed', importedChapters: imported })

  } catch (e: any) {
    addLog(jobId, `💥 Lỗi: ${e?.message}`)
    updateJob(jobId, { status: 'failed', error: e?.message })
    await prisma.crawlSchedule.update({
      where: { id: schedule.id },
      data: { lastError: e?.message },
    })
  }
}
