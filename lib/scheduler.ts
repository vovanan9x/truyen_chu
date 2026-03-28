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
import { getAdapterWithDbConfig, fetchUrl, downloadAndSaveCover } from './crawl-adapters'
import type { ChapterRef } from './crawl-adapters'
import * as cheerio from 'cheerio'
import { fetchWithRetry, getHealthyProxy, markProxyCooling, processInBatches } from './crawl-utils'
import { getCrawlSettings } from './crawl-settings'

const CHECK_INTERVAL_MS = 60_000   // Check mỗi 1 phút
const MAX_PER_TICK = 3             // Tối đa 3 schedules mỗi lần check

// In-memory cancel flags for running batch schedule jobs
const _cancelledBatch = new Set<string>()  // scheduleId

/** Cancel a running batch schedule job by scheduleId */
export function cancelBatchSchedule(scheduleId: string) {
  _cancelledBatch.add(scheduleId)
}

function isBatchCancelled(scheduleId: string) {
  return _cancelledBatch.has(scheduleId)
}

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

  // Also check batch crawl schedules
  runBatchSchedulerTick().catch((e: any) => console.error('[Scheduler] Batch tick error:', e?.message))
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

// ─── Batch Crawl Scheduler ─────────────────────────────────────────────────────

async function runBatchSchedulerTick() {
  const now = new Date()
  const due = await prisma.batchCrawlSchedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    take: 2,
  })
  if (due.length === 0) return
  console.log(`[BatchScheduler] ${due.length} batch schedule(s) due`)
  for (const bs of due) {
    // Update nextRunAt immediately to prevent double-run
    const nextRunAt = new Date(now.getTime() + bs.intervalMinutes * 60_000)
    await prisma.batchCrawlSchedule.update({
      where: { id: bs.id },
      data: { lastRunAt: now, nextRunAt, lastError: null },
    })
    // Run in background
    runBatchSchedule(bs.id).catch(async (e: any) => {
      console.error(`[BatchScheduler] \u274C "${bs.name}":`, e?.message)
      await prisma.batchCrawlSchedule.update({
        where: { id: bs.id },
        data: { lastError: e?.message?.slice(0, 200) },
      }).catch(() => {})
    })
  }
}

/** Scan a batch schedule's categoryUrl, then import new stories. Exported for manual trigger. */
export async function runBatchSchedule(scheduleId: string): Promise<{ imported: number; skipped: number; errors: number; storyUrls: string[] }> {
  const bs = await prisma.batchCrawlSchedule.findUniqueOrThrow({ where: { id: scheduleId } })
  console.log(`[BatchScheduler] \uD83D\uDE80 Running "${bs.name}": ${bs.categoryUrl}`)

  // Clear any previous cancel flag
  _cancelledBatch.delete(scheduleId)

  // Load proxy pool
  const crawlSettings = await getCrawlSettings()
  const proxyPool = crawlSettings.proxies ?? []
  const crawlOpts = { concurrency: bs.concurrency, chapterDelay: bs.chapterDelay, proxyPool, scheduleId }

  // ── Step 1: collect story URLs from category page ──────────────────────────
  const storyUrls = await collectCategoryUrls(bs.categoryUrl, bs.maxPages, bs.maxStories)
  console.log(`[BatchScheduler] Found ${storyUrls.length} story URLs`)

  if (storyUrls.length === 0) {
    await prisma.batchCrawlSchedule.update({ where: { id: scheduleId }, data: { lastImported: 0 } })
    return { imported: 0, skipped: 0, errors: 0, storyUrls: [] }
  }

  // ── Step 2: resolve existing stories ───────────────────────────────────────
  const existingStories = await prisma.story.findMany({
    where: { sourceUrl: { in: storyUrls } },
    select: {
      sourceUrl: true,
      chapters: { select: { chapterNum: true }, orderBy: { chapterNum: 'desc' }, take: 1 },
    },
  })
  const existingMap = new Map(
    existingStories.map(s => [s.sourceUrl!, s.chapters[0]?.chapterNum ?? 0])
  )

  // ── Step 3: decide what to crawl ───────────────────────────────────────────
  // newUrls   — stories not yet in DB → always import from bs.fromChapter
  // updateUrls — stories already in DB → only if updateExisting=true, from lastChapter+1
  const limit = bs.maxStories
  const newUrls = storyUrls.filter(u => !existingMap.has(u)).slice(0, limit)
  const updateUrls = bs.updateExisting
    ? storyUrls.filter(u => existingMap.has(u)).slice(0, limit)
    : []

  let skipped = storyUrls.length - newUrls.length - updateUrls.length
  if (bs.skipExisting && !bs.updateExisting) skipped = existingMap.size

  console.log(`[BatchScheduler] New: ${newUrls.length}, Update: ${updateUrls.length}, Skip: ${skipped}`)

  // ── Step 4: import new stories ─────────────────────────────────────────────
  let imported = 0
  let errors = 0

  for (const storyUrl of newUrls) {
    if (isBatchCancelled(scheduleId)) break
    try {
      await importOneBatchStory(storyUrl, bs.fromChapter, crawlOpts)
      imported++
      await sleep(2000)
    } catch (e: any) {
      console.error(`[BatchScheduler] \u274C (new) ${storyUrl}:`, e?.message)
      errors++
    }
  }

  // ── Step 5: update existing stories (new chapters only) ────────────────────
  for (const storyUrl of updateUrls) {
    if (isBatchCancelled(scheduleId)) break
    const lastChapter = existingMap.get(storyUrl) ?? 0
    const fromChapter = lastChapter + 1
    try {
      await importOneBatchStory(storyUrl, fromChapter, crawlOpts)
      imported++
      await sleep(2000)
    } catch (e: any) {
      console.error(`[BatchScheduler] \u274C (update) ${storyUrl}:`, e?.message)
      errors++
    }
  }

  await prisma.batchCrawlSchedule.update({ where: { id: scheduleId }, data: { lastImported: imported } })
  console.log(`[BatchScheduler] \u2705 "${bs.name}" done: +${imported} imported, ${skipped} skipped, ${errors} errors`)
  return { imported, skipped, errors, storyUrls: [...newUrls, ...updateUrls] }
}

/** Collect story URLs from a category URL (HTML scrape or sitemap) */
async function collectCategoryUrls(categoryUrl: string, maxPages: number, maxStories: number): Promise<string[]> {
  const origin = new URL(categoryUrl).origin
  const isSitemap = /\.(xml|xml\.gz)(\?.*)?$/i.test(categoryUrl) || categoryUrl.toLowerCase().includes('sitemap')

  if (isSitemap) {
    // Simple sitemap fetch — grab <loc> entries
    const res = await fetch(categoryUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) })
    const xml = await res.text()
    const locs = Array.from(xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)).map(m => m[1].trim())
    return locs.filter(u => {
      try {
        const p = new URL(u)
        if (p.origin !== origin) return false
        const parts = p.pathname.split('/').filter(Boolean)
        return parts.length === 1 && /^[a-z0-9-]+$/.test(parts[0])
      } catch { return false }
    }).slice(0, maxStories)
  }

  // HTML scrape
  const domain = new URL(categoryUrl).hostname.replace(/^www\./, '')
  let storyListSel: string | null = null
  try {
    const cfg = await prisma.siteConfig.findUnique({ where: { domain } })
    storyListSel = cfg?.storyListSel ?? null
  } catch {}

  const urls: string[] = []
  let currentUrl = categoryUrl
  const catSegments = new URL(categoryUrl).pathname.split('/').filter(Boolean)

  for (let page = 0; page < maxPages && urls.length < maxStories; page++) {
    try {
      const html = await fetchUrl(currentUrl, 15000)
      const $ = cheerio.load(html)

      // Extract story links
      const tryHref = (href: string | undefined) => {
        if (!href) return
        try {
          const abs = href.startsWith('http') ? href : new URL(href, currentUrl).toString()
          const u = new URL(abs)
          if (u.origin !== origin) return
          const parts = u.pathname.split('/').filter(Boolean)
          if (parts.length !== 1) return
          const slug = parts[0]
          if (catSegments.includes(slug)) return
          if (!/^[a-zA-Z0-9\u00C0-\u024F-]+$/.test(slug)) return
          const clean = `${origin}/${slug}`
          if (!urls.includes(clean)) urls.push(clean)
        } catch {}
      }

      if (storyListSel) {
        $(storyListSel).each((_, el) => {
          const href = $(el).is('a') ? $(el).attr('href') : $(el).find('a').first().attr('href')
          tryHref(href)
        })
      } else {
        $('a[href]').each((_, el) => tryHref($(el).attr('href')))
      }

      if (urls.length >= maxStories) break

      // Next page
      const nextHref = $('a[rel="next"], .pagination .next a, li.next a').first().attr('href')
      if (!nextHref || nextHref === '#') break
      const nextUrl = nextHref.startsWith('http') ? nextHref : new URL(nextHref, currentUrl).toString()
      if (nextUrl === currentUrl) break
      currentUrl = nextUrl
      await sleep(300)
    } catch { break }
  }
  return urls.slice(0, maxStories)
}

/** Crawl and import a single story (info + all chapters) with proxy + parallel fetching */
async function importOneBatchStory(
  storyUrl: string,
  fromChapter: number,
  opts: { concurrency: number; chapterDelay: number; proxyPool: string[]; scheduleId: string }
) {
  const { concurrency, chapterDelay, proxyPool, scheduleId } = opts
  const { adapter, cookies: siteCookies } = await getAdapterWithDbConfig(storyUrl)

  // Pick sticky proxy for this story
  const stickyProxy = getHealthyProxy(proxyPool)

  const { html, attempts } = await fetchWithRetry(storyUrl, 15000, 3, siteCookies, stickyProxy, undefined, proxyPool)
  if (attempts > 1) console.log(`[BatchScheduler] Story page retry x${attempts}: ${storyUrl}`)

  const info = adapter.fetchStoryInfo(storyUrl, html)
  if (!info.title) throw new Error('Cannot parse story info')

  // Upsert story
  const { slugify } = await import('./utils')
  const slug = slugify(info.title)

  // Find unique slug
  let finalSlug = slug
  let attempt = 0
  while (attempt < 5) {
    const exists = await prisma.story.findUnique({ where: { slug: finalSlug } })
    if (!exists) break
    if (exists.sourceUrl === storyUrl) { finalSlug = exists.slug; break }
    attempt++
    finalSlug = `${slug}-${attempt}`
  }

  // Upsert genres
  const genreIds: string[] = []
  for (const gName of info.genres) {
    if (!gName.trim()) continue
    const gSlug = slugify(gName)
    const genre = await prisma.genre.upsert({
      where: { slug: gSlug },
      create: { name: gName, slug: gSlug },
      update: {},
    })
    genreIds.push(genre.id)
  }

  const storyData: any = {
    title: info.title, author: info.author || null,
    description: info.description || null,
    coverUrl: info.coverUrl || null,
    status: info.status, sourceUrl: storyUrl,
  }

  const story = await prisma.story.upsert({
    where: { slug: finalSlug },
    create: { ...storyData, slug: finalSlug },
    update: storyData,
  })

  // Sync genres
  await prisma.storyGenre.deleteMany({ where: { storyId: story.id } })
  if (genreIds.length > 0) {
    await prisma.storyGenre.createMany({
      data: genreIds.map(genreId => ({ storyId: story.id, genreId })),
      skipDuplicates: true,
    })
  }

  // Fetch chapter list
  let chapters: ChapterRef[] = []
  if (adapter.fetchAllChapters) {
    chapters = await adapter.fetchAllChapters(storyUrl, html)
  } else {
    chapters = adapter.fetchChapterList(storyUrl, html).chapters
  }

  const toImport = chapters.filter(c => c.num >= fromChapter).sort((a, b) => a.num - b.num)
  let savedCount = 0
  let failCount = 0

  // Parallel chapter fetching using processInBatches + fetchWithRetry + proxy
  const toUpsert: { storyId: string; chapterNum: number; title: string | null; content: string; wordCount: number; isLocked: boolean; coinCost: number }[] = []

  await processInBatches(
    toImport,
    concurrency,
    async (ch) => {
      if (isBatchCancelled(scheduleId)) return
      try {
        let chProxy = getHealthyProxy(proxyPool)
        let chHtml = ''
        for (let a = 1; a <= 3; a++) {
          try {
            const r = await fetchWithRetry(ch.url, 12000, 1, siteCookies, chProxy, undefined, proxyPool)
            chHtml = r.html; break
          } catch (e: any) {
            if (a === 3) throw e
            const msg = e?.message ?? ''
            const is503 = msg.includes('503')
            if (is503 && chProxy && proxyPool.length > 1) {
              markProxyCooling(chProxy)
              chProxy = getHealthyProxy(proxyPool.filter(p => p !== chProxy)) ?? getHealthyProxy(proxyPool)
              await sleep(3000)
            } else {
              await sleep(is503 ? 45000 * a : 2000 * a)
            }
          }
        }
        const content = adapter.fetchChapterContent(ch.url, chHtml)
        if (!content || content.length < 50) { failCount++; return }
        const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
        toUpsert.push({ storyId: story.id, chapterNum: ch.num, title: ch.title || null, content, wordCount, isLocked: false, coinCost: 0 })
        savedCount++
      } catch { failCount++ }
    },
    chapterDelay,
    () => isBatchCancelled(scheduleId)
  )

  // Bulk write
  if (toUpsert.length > 0) {
    await prisma.chapter.createMany({ data: toUpsert, skipDuplicates: true }).catch(async () => {
      // Fallback: upsert one by one if createMany fails (e.g. duplicates)
      for (const c of toUpsert) {
        await prisma.chapter.upsert({
          where: { storyId_chapterNum: { storyId: story.id, chapterNum: c.chapterNum } },
          update: { content: c.content, wordCount: c.wordCount, title: c.title },
          create: c,
        }).catch(() => {})
      }
    })
  }

  console.log(`[BatchScheduler] ✅ Imported "${info.title}" — ${savedCount}/${toImport.length} ch. | fail=${failCount} | parallel=${concurrency}`)
}
