/**
 * Built-in background scheduler — chạy ngay trong process Next.js.
 * Không cần cron ngoài (Windows Task Scheduler, Vercel Cron, etc.)
 *
 * Hoạt động:
 * - Poll DB mỗi CHECK_INTERVAL ms (mặc định 1 phút)
 * - Tìm CrawlSchedule có isActive=true và nextRunAt <= now
 * - Chạy crawl chương mới cho mỗi schedule
 * - Ghi CrawlLog vào DB sau mỗi lần chạy (B)
 * - Tạo Notification cho user đã bookmark khi có chương mới (A)
 */

import { randomUUID } from 'crypto'
import { prisma } from './prisma'
import { redis, cacheDel } from './redis'
import { createJob, updateJob, addLog } from './crawl-jobs'
import { getAdapterWithDbConfig, fetchUrl } from './crawl-adapters'
import type { ChapterRef } from './crawl-adapters'

const CHECK_INTERVAL_MS = 60_000   // Check mỗi 1 phút
const MAX_PER_TICK = 3             // Tối đa 3 schedules mỗi lần check

let schedulerStarted = false
let schedulerTimer: ReturnType<typeof setInterval> | null = null

export function startScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true
  console.log('[Scheduler] ✅ Built-in crawler scheduler started (interval: 1 min)')

  // Chạy ngay lần đầu sau 30s, rồi mỗi 1 phút
  setTimeout(() => {
    runSchedulerTick()
    schedulerTimer = setInterval(runSchedulerTick, CHECK_INTERVAL_MS)
  }, 30_000)
}

export function stopScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer)
  schedulerStarted = false
  console.log('[Scheduler] ⛔ Scheduler stopped')
}

export function isSchedulerRunning() {
  return schedulerStarted
}

async function runSchedulerTick() {
  try {
    const now = new Date()
    const dueShedules = await prisma.crawlSchedule.findMany({
      where: { isActive: true, nextRunAt: { lte: now } },
      include: { story: { select: { id: true, title: true } } },
      take: MAX_PER_TICK,
    })

    if (dueShedules.length === 0) return

    console.log(`[Scheduler] 🕐 ${dueShedules.length} schedule(s) due`)

    for (const schedule of dueShedules) {
      // Update nextRunAt ngay để tránh chạy 2 lần
      const nextRunAt = new Date(now.getTime() + schedule.intervalMinutes * 60_000)
      await prisma.crawlSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt, lastError: null },
      })

      const jobId = randomUUID()
      const fromChapter = schedule.lastChapterNum + 1
      createJob(jobId, { url: schedule.sourceUrl, fromChapter, toChapter: 9999 })

      console.log(`[Scheduler] 🚀 Crawling "${schedule.story.title}" từ ch.${fromChapter}`)

      // Chạy background (không await để không block tick tiếp theo)
      runScheduledCrawlJob(jobId, schedule, fromChapter).catch(async (e: any) => {
        console.error(`[Scheduler] ❌ "${schedule.story.title}":`, e?.message)
        await prisma.crawlSchedule.update({
          where: { id: schedule.id },
          data: { lastError: e?.message?.slice(0, 200) },
        }).catch(() => {})
      })
    }
  } catch (e: any) {
    console.error('[Scheduler] Tick error:', e?.message)
  }
}

async function runScheduledCrawlJob(
  jobId: string,
  schedule: { id: string; sourceUrl: string; story: { id: string; title: string } },
  fromChapter: number
) {
  const startedAt = new Date()

  // [B] Tạo CrawlLog record ngay khi bắt đầu
  let crawlLogId: string | null = null
  try {
    const log = await prisma.crawlLog.create({
      data: {
        scheduleId: schedule.id,
        storyId: schedule.story.id,
        storyTitle: schedule.story.title,
        sourceUrl: schedule.sourceUrl,
        status: 'running',
        triggeredBy: 'auto',
      },
    })
    crawlLogId = log.id
  } catch { /* nếu CrawlLog chưa tồn tại thì bỏ qua */ }

  updateJob(jobId, { status: 'running', storyTitle: schedule.story.title, storyId: schedule.story.id })
  addLog(jobId, `🕐 [Auto] Crawl tự động: ${schedule.story.title}`)
  addLog(jobId, `📡 Source: ${schedule.sourceUrl}`)
  addLog(jobId, `🔢 Từ chương ${fromChapter}`)

  const { adapter } = await getAdapterWithDbConfig(schedule.sourceUrl)
  addLog(jobId, `🔌 Adapter: ${adapter.name}`)

  const storyHtml = await fetchUrl(schedule.sourceUrl)
  const info = adapter.fetchStoryInfo(schedule.sourceUrl, storyHtml)

  // Collect chapters
  let allChapters: ChapterRef[] = []
  let pageUrl: string | undefined = schedule.sourceUrl
  let pageCount = 0

  while (pageUrl && pageCount < 50) {
    const pageHtml = pageUrl === schedule.sourceUrl ? storyHtml : await fetchUrl(pageUrl)
    const { chapters, nextPageUrl } = adapter.fetchChapterList(pageUrl, pageHtml)
    allChapters = [...allChapters, ...chapters]
    pageUrl = nextPageUrl
    pageCount++
    if (nextPageUrl) await sleep(400)
  }

  const toImport = allChapters
    .filter(c => c.num >= fromChapter)
    .sort((a, b) => a.num - b.num)

  if (toImport.length === 0) {
    addLog(jobId, `⏭️ Không có chương mới`)
    updateJob(jobId, { status: 'completed', totalChapters: 0, importedChapters: 0 })

    // [B] Cập nhật log: no_new
    if (crawlLogId) {
      await prisma.crawlLog.update({
        where: { id: crawlLogId },
        data: { status: 'no_new', finishedAt: new Date(), chaptersImported: 0, chaptersTotal: 0 },
      }).catch(() => {})
    }
    return
  }

  addLog(jobId, `📚 ${toImport.length} chương mới (ch.${toImport[0].num}→ch.${toImport[toImport.length - 1].num})`)
  updateJob(jobId, { totalChapters: toImport.length })

  let imported = 0
  let maxChapter = fromChapter - 1
  const newChapterNums: number[] = []

  for (const ch of toImport) {
    try {
      const chHtml = await fetchUrl(ch.url, 12000)
      const content = adapter.fetchChapterContent(ch.url, chHtml)
      const wordCount = content.split(/\s+/).filter(Boolean).length

      if (!content || wordCount < 10) continue

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
      newChapterNums.push(ch.num)
      updateJob(jobId, { importedChapters: imported })
      if (imported % 5 === 0 || imported === 1)
        addLog(jobId, `✅ ${imported}/${toImport.length}: ch.${ch.num}`)

      await sleep(1000) // 1s delay to be polite
    } catch (e: any) {
      addLog(jobId, `❌ Ch.${ch.num}: ${e?.message?.slice(0, 80)}`)
    }
  }

  // Update lastChapterNum
  if (maxChapter >= fromChapter) {
    await prisma.crawlSchedule.update({
      where: { id: schedule.id },
      data: { lastChapterNum: maxChapter },
    })
  }

  // Update story status nếu đã hoàn thành
  if (info.status && info.status !== 'ONGOING') {
    await prisma.story.update({ where: { id: schedule.story.id }, data: { status: info.status as any } })
  }

  // [A] Gửi thông báo chương mới cho user đã bookmark truyện
  if (imported > 0) {
    await sendNewChapterNotifications(schedule.story.id, schedule.story.title, newChapterNums)
  }

  // [B] Cập nhật CrawlLog hoàn thành
  if (crawlLogId) {
    await prisma.crawlLog.update({
      where: { id: crawlLogId },
      data: {
        status: imported > 0 ? 'success' : 'no_new',
        finishedAt: new Date(),
        chaptersImported: imported,
        chaptersTotal: toImport.length,
      },
    }).catch(() => {})
  }

  addLog(jobId, `🎉 Xong! Imported ${imported}/${toImport.length}`)
  updateJob(jobId, { status: 'completed', importedChapters: imported })
  console.log(`[Scheduler] ✅ "${schedule.story.title}" +${imported} chapters`)
}

// [A] Tạo Notification cho tất cả user đã bookmark truyện
async function sendNewChapterNotifications(storyId: string, storyTitle: string, newChapterNums: number[]) {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { storyId },
      select: { userId: true },
    })

    if (bookmarks.length === 0) return

    const latestChapter = Math.max(...newChapterNums)
    const chapterText = newChapterNums.length === 1
      ? `Chương ${latestChapter}`
      : `${newChapterNums.length} chương mới (đến chương ${latestChapter})`

    // Lấy slug của story để tạo link
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { slug: true },
    })

    await prisma.notification.createMany({
      data: bookmarks.map(b => ({
        userId: b.userId,
        type: 'NEW_CHAPTER',
        title: `${storyTitle} có chương mới`,
        message: `${chapterText} đã được cập nhật.`,
        link: story ? `/truyen/${story.slug}/chuong/${latestChapter}` : `/truyen/${storyId}`,
      })),
      skipDuplicates: true,
    })

    // Invalidate cache + publish SSE event cho từng user — dùng pipeline cho hiệu suất
    try {
      const pipeline = redis.pipeline()
      for (const { userId } of bookmarks) {
        pipeline.del(`notif:unread:${userId}`)
        // count: -1 = SSE client sẽ refetch count thực từ API
        pipeline.publish(`notif:push:${userId}`, JSON.stringify({ count: -1 }))
      }
      await pipeline.exec()
    } catch {
      // Redis offline — notification vẫn lưu DB, chỉ mất realtime push badge
    }

    console.log(`[Scheduler] 🔔 Sent notifications to ${bookmarks.length} users for "${storyTitle}"`)
  } catch (e: any) {
    console.error('[Scheduler] Notification error:', e?.message)
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
