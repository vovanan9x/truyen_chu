import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createJob, updateJob, addLog, isCancelled } from '@/lib/crawl-jobs'
import { getAdapterWithDbConfig, fetchUrl, countWordsInHtml, downloadAndSaveCover } from '@/lib/crawl-adapters'
import { getCrawlSettings } from '@/lib/crawl-settings'
import type { ChapterRef } from '@/lib/crawl-adapters'

// Global job counter — used to pick sticky proxy in round-robin
let _jobCounter = 0

// Slugify Vietnamese text
function slugify(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
}

// ─── Fetch with retry + exponential backoff ────────────────────────────────
async function fetchWithRetry(
  url: string,
  timeout = 15000,
  maxRetries = 3,
  cookies?: string,
  stickyProxyUrl?: string
): Promise<{ html: string; attempts: number }> {
  let lastError: Error = new Error('Unknown error')
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const html = await fetchUrl(url, timeout, cookies, stickyProxyUrl)
      return { html, attempts: attempt }
    } catch (e: any) {
      lastError = e
      if (e?.message?.includes('404')) throw e
      if (attempt < maxRetries) {
        const isRateLimit = e?.message?.includes('429') || e?.message?.includes('Too Many')
        const baseDelay = isRateLimit ? 5000 : 2000
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}

// ─── Process chapters in parallel batches ─────────────────────────────────
async function processInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<void>,
  delayBetweenBatches = 400,
  jobId?: string
) {
  for (let i = 0; i < items.length; i += batchSize) {
    // Kiểm tra cancel trước mỗi batch — dừng sạch sẽ không kill giữa chừng
    if (jobId && isCancelled(jobId)) break
    const batch = items.slice(i, i + batchSize)
    await Promise.allSettled(batch.map((item, j) => fn(item, i + j)))
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, delayBetweenBatches))
    }
  }
}

// ─── Main crawl job ────────────────────────────────────────────────────────
async function runCrawlJob(
  jobId: string,
  url: string,
  fromChapter: number,
  toChapter: number,
  batchDelay: number,
  overwrite: boolean,
  concurrency: number
) {
  const startTime = Date.now()
  updateJob(jobId, { status: 'running' })
  addLog(jobId, `🚀 Bắt đầu crawl: ${url}`)
  addLog(jobId, `⚙️ Cấu hình: concurrency=${concurrency} | delay=${batchDelay}ms | overwrite=${overwrite}`)

  // ── Sticky proxy: pick 1 proxy for this entire job ──────────────────────
  const crawlSettings = await getCrawlSettings()
  const stickyProxy = crawlSettings.proxies.length > 0
    ? crawlSettings.proxies[_jobCounter % crawlSettings.proxies.length]
    : undefined
  _jobCounter++
  if (stickyProxy) {
    addLog(jobId, `🔗 Sticky proxy: ${stickyProxy.replace(/:([^:@]+)@/, ':***@')} (proxy #${(_jobCounter - 1) % crawlSettings.proxies.length + 1}/${crawlSettings.proxies.length})`)
  }
  // ────────────────────────────────────────────────────────────────────────

  const { adapter, cookies: siteCookies } = await getAdapterWithDbConfig(url)
  addLog(jobId, `🔌 Adapter: ${adapter.name}${siteCookies ? ' 🍪 Cookie: đã cấu hình' : ''}`)

  // Error tracking
  const errorLog: { chapterNum: number; url: string; error: string; attempts: number }[] = []

  try {
    // 1. Fetch story info
    addLog(jobId, '📥 Đang tải trang truyện...')
    let storyHtml: string
    try {
      const result = await fetchWithRetry(url, 15000, 3, siteCookies, stickyProxy)
      storyHtml = result.html
    } catch (e: any) {
      const msg = e?.message ?? 'Không tải được trang truyện'
      addLog(jobId, `❌ FATAL: Không tải được trang truyện — ${msg}`)
      updateJob(jobId, { status: 'failed', error: msg })
      return
    }

    const info = adapter.fetchStoryInfo(url, storyHtml)

    // Detect Cloudflare redirect: if page returned is homepage/different page
    const canonicalMatch = storyHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
      || storyHtml.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
    const canonical = canonicalMatch?.[1]
    const expectedHost = new URL(url).hostname
    if (canonical) {
      const canonicalUrl = canonical.startsWith('http') ? canonical : `https://${expectedHost}${canonical}`
      const isSamePage = canonicalUrl.replace(/\/$/, '') === url.replace(/\/$/, '')
        || canonicalUrl.includes(new URL(url).pathname.split('/')[1])
      if (!isSamePage) {
        addLog(jobId, `⚠️ CẢNH BÁO: Site trả về trang khác (canonical: ${canonical})`)
        addLog(jobId, `⚠️ Nguyên nhân có thể: Cloudflare Bot Protection chặn request không có cookie/JS`)
        addLog(jobId, `⚠️ Khuyến nghị: Thêm cookie CF_CLEARANCE hoặc dùng Playwright headless`)
        addLog(jobId, `ℹ️ Tiếp tục với dữ liệu có sẵn (title từ trang này: "${info.title || 'không tìm được'}")`)
      }
    }

    if (!info.title) {
      updateJob(jobId, { status: 'failed', error: 'Không đọc được tên truyện' })
      addLog(jobId, `❌ FATAL: Không tìm thấy tiêu đề — HTML nhận về: ${storyHtml.length} bytes, canonical: ${canonical || 'không có'}`)
      addLog(jobId, '❌ Kiểm tra selector "titleSelector" trong Cấu hình site, hoặc site đang chặn crawl (Cloudflare)')
      return
    }

    addLog(jobId, `📖 ${info.title} — ${info.author || 'Không rõ tác giả'} — ${info.genres.join(', ') || 'Chưa rõ thể loại'}`)

    // 2. Download cover
    let localCoverUrl: string | null = info.coverUrl || null
    if (info.coverUrl) {
      addLog(jobId, `🖼️ Tải ảnh bìa...`)
      try {
        const saved = await downloadAndSaveCover(info.coverUrl)
        if (saved) { localCoverUrl = saved; addLog(jobId, `✅ Ảnh bìa: ${saved}`) }
        else addLog(jobId, `⚠️ Không tải được ảnh bìa (${info.coverUrl}) — dùng URL gốc`)
      } catch (e: any) {
        addLog(jobId, `⚠️ Lỗi ảnh bìa: ${e?.message} — dùng URL gốc`)
      }
    }

    // 3. Create/update story in DB
    let slug = slugify(info.title)
    const existing = await prisma.story.findFirst({
      where: { OR: [{ slug }, { sourceUrl: url }] }
    })
    let story: { id: string }
    if (existing) {
      addLog(jobId, `♻️ Cập nhật truyện đã có (id: ${existing.id})`)
      story = await prisma.story.update({
        where: { id: existing.id },
        data: { title: info.title, author: info.author || null, description: info.description || null, coverUrl: localCoverUrl, status: info.status, sourceUrl: url },
      })
      slug = existing.slug
    } else {
      const slugBase = slug; let suffix = 0
      while (await prisma.story.findUnique({ where: { slug } })) { suffix++; slug = `${slugBase}-${suffix}` }
      story = await prisma.story.create({
        data: { title: info.title, slug, author: info.author || null, description: info.description || null, coverUrl: localCoverUrl, status: info.status, sourceUrl: url, sourceName: adapter.name },
      })
      addLog(jobId, `✅ Tạo truyện mới: slug="${slug}"`)
    }

    // Genre linking — upsert genres that don't exist yet, then link all
    if (info.genres.length > 0) {
      const genreRecords = await Promise.all(
        info.genres
          .map(name => name.trim())
          .filter(name => name.length > 0)
          .map(name => {
            const genreSlug = slugify(name)
            return prisma.genre.upsert({
              where: { slug: genreSlug },
              create: { name, slug: genreSlug },
              update: {}, // giữ nguyên nếu đã tồn tại
            })
          })
      )
      await prisma.storyGenre.createMany({
        data: genreRecords.map(g => ({ storyId: story.id, genreId: g.id })),
        skipDuplicates: true,
      })
      addLog(jobId, `🏷️ Gán ${genreRecords.length}/${info.genres.length} thể loại: ${genreRecords.map(g => g.name).join(', ')}`)
    }

    updateJob(jobId, { storyTitle: info.title, storyId: story.id })

    // 4. Collect all chapters
    addLog(jobId, '📋 Thu thập danh sách chương...')
    let allChapters: ChapterRef[] = []
    try {
      if (adapter.fetchAllChapters) {
        addLog(jobId, `  → Thử AJAX API / HTML pagination của ${adapter.name}`)
        addLog(jobId, `  → HTML nhận = ${storyHtml.length} bytes | storyId regex: ${storyHtml.match(/page\s*\(\s*(\d+)/)?.[1] ? 'Tìm thấy id=' + storyHtml.match(/page\s*\(\s*(\d+)/)?.[1] : 'Không tìm thấy page(\d+)'}`)
        allChapters = await adapter.fetchAllChapters(url, storyHtml)
        addLog(jobId, `  → Kết quả fetchAllChapters: ${allChapters.length} ch.`)
      } else {
        let pageUrl: string | undefined = url; let pageCount = 0
        while (pageUrl && pageCount < 50) {
          const pageHtml = pageUrl === url ? storyHtml : await fetchUrl(pageUrl, 15000, siteCookies, stickyProxy)
          const { chapters, nextPageUrl } = adapter.fetchChapterList(pageUrl, pageHtml)
          allChapters = [...allChapters, ...chapters]
          pageUrl = nextPageUrl; pageCount++
          if (nextPageUrl) addLog(jobId, `  → Trang ${pageCount}: +${chapters.length} chương`)
          await new Promise(r => setTimeout(r, 300))
        }
      }
    } catch (e: any) {
      addLog(jobId, `⚠️ Lỗi thu thập danh sách chương: ${e?.message} — tiếp tục với ${allChapters.length} chương đã có`)
    }

    const chapterMap = new Map<number, ChapterRef>()
    for (const ch of allChapters) chapterMap.set(ch.num, ch)
    const toImport = Array.from(chapterMap.values())
      .filter(c => c.num >= fromChapter && c.num <= toChapter)
      .sort((a, b) => a.num - b.num)

    const totalInRange = toImport.length
    addLog(jobId, `📚 Tổng: ${chapterMap.size} ch. | Sẽ import: ${totalInRange} ch. (ch.${fromChapter}→${toChapter === 9999 ? 'hết' : toChapter}) | Parallel: ${concurrency}`)
    updateJob(jobId, { totalChapters: totalInRange })

    if (totalInRange === 0) {
      updateJob(jobId, { status: 'completed' })
      addLog(jobId, `⚠️ Không tìm thấy chương nào (tổng ${chapterMap.size} ch. từ ${allChapters.length} kết quả)`)
      if (allChapters.length === 0) {
        addLog(jobId, `🔍 DEBUG: HTML = ${storyHtml.length} bytes | Cookie: ${siteCookies ? 'Có' : 'Không'}`)
        addLog(jobId, `🔍 100 chars HTML: ${storyHtml.slice(0, 200).replace(/\s+/g,' ')}`)
        const looksLikeHomepage = storyHtml.includes('Truy\u1ec7n M\u1edbi C\u1eadp Nh\u1eadt') || storyHtml.includes('truyen-hot')
        const looksLikeChallenge = storyHtml.includes('cf-browser-verification') || storyHtml.includes('challenge-form') || storyHtml.length < 5000
        if (looksLikeChallenge) {
          addLog(jobId, `🚧 HTML quá ngắn (${storyHtml.length}b) hoặc chứa Cloudflare challenge!`)
          addLog(jobId, `💡 Cần lấy cookie mới từ browser và cập nhật trong Cấu hình site`)
        } else if (looksLikeHomepage) {
          addLog(jobId, `🚫 Phát hiện redirect trang chủ — cookie có thể hết hạn`)
        } else {
          addLog(jobId, `💡 Thử mở URL trong browser để kiểm tra, sau đó kiểm tra selector trong Cấu hình site`)
        }
      }
      return
    }

    // 5. Bulk check existing chapters

    const existingChapters = await prisma.chapter.findMany({
      where: { storyId: story.id, chapterNum: { in: toImport.map(c => c.num) } },
      select: { chapterNum: true, content: true }
    })
    const existingMap = new Map(existingChapters.map(c => [c.chapterNum, !!c.content]))

    // 6. Import chapters in parallel batches
    const failed: number[] = []
    const skipped: number[] = []
    let imported = 0
    const chaptersToBatchInsert: { storyId: string; chapterNum: number; title: string | null; content: string; wordCount: number; isLocked: boolean; coinCost: number }[] = []

    const progressInterval = Math.max(1, Math.floor(totalInRange / 20)) // log every 5%

    await processInBatches(toImport, concurrency, async (ch) => {
      try {
        // Skip if exists and not overwriting
        if (!overwrite && existingMap.get(ch.num)) {
          skipped.push(ch.num)
          const prog = skipped.length + imported + failed.length
          updateJob(jobId, { importedChapters: prog, skippedChapters: skipped })
          return
        }

        // Fetch with retry
        let html: string
        let attempts = 1
        let lastRetryMsg = ''
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await fetchWithRetry(ch.url, 12000, 1, siteCookies, stickyProxy) // 1 try per call, we manage retries here
            html = res.html
            attempts = attempt
            break
          } catch (e: any) {
            if (attempt === 3) throw e
            lastRetryMsg = e?.message ?? ''
            const isRateLimit = lastRetryMsg.includes('429') || lastRetryMsg.includes('Too Many')
            const delay = isRateLimit ? 8000 * attempt : 2000 * attempt
            addLog(jobId, `  ↩️ Ch.${ch.num} retry ${attempt}/3 sau ${delay / 1000}s — ${lastRetryMsg.slice(0, 80)}`)
            await new Promise(r => setTimeout(r, delay))
          }
        }

        const content = adapter.fetchChapterContent(ch.url, html!)
        const wordCount = countWordsInHtml(content)

        if (!content || wordCount < 10) {
          const errMsg = `Nội dung quá ngắn (${wordCount} từ) — selector "chapterContentSel" có thể sai`
          addLog(jobId, `⚠️ Ch.${ch.num}: ${errMsg}`)
          errorLog.push({ chapterNum: ch.num, url: ch.url, error: errMsg, attempts })
          failed.push(ch.num)
          updateJob(jobId, { failedChapters: failed })
          return
        }

        // Batch upsert: track for later bulk insert
        chaptersToBatchInsert.push({
          storyId: story.id, chapterNum: ch.num,
          title: ch.title || null, content, wordCount,
          isLocked: false, coinCost: 0
        })

        imported++
        const total = imported + skipped.length + failed.length
        updateJob(jobId, { importedChapters: total })

        if (imported % progressInterval === 0 || imported === 1) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
          addLog(jobId, `✅ ${total}/${totalInRange} ch. | import=${imported} skip=${skipped.length} fail=${failed.length} | ${elapsed}s`)
        }

        // Flush to DB every 50 chapters to reduce memory & show partial results sooner
        if (chaptersToBatchInsert.length > 0 && chaptersToBatchInsert.length % 50 === 0) {
          const toFlush = chaptersToBatchInsert.splice(0, 50)
          const newOnes = toFlush.filter(c => !existingMap.has(c.chapterNum))
          const updOnes = toFlush.filter(c => existingMap.has(c.chapterNum))
          if (newOnes.length > 0) await prisma.chapter.createMany({ data: newOnes, skipDuplicates: true }).catch(() => {})
          if (updOnes.length > 0) {
            await Promise.all(updOnes.map(c => prisma.chapter.update({
              where: { storyId_chapterNum: { storyId: story.id, chapterNum: c.chapterNum } },
              data: { content: c.content, wordCount: c.wordCount, title: c.title },
            }).catch(() => {})))
          }
        }

        if (attempts > 1) {
          addLog(jobId, `  🔄 Ch.${ch.num}: thành công sau ${attempts} lần thử`)
        }
      } catch (e: any) {
        const msg = e?.message ?? 'Lỗi không xác định'
        // Categorize error
        const httpMatch = msg.match(/HTTP (\d+)/)
        const httpCode = httpMatch ? httpMatch[1] : null
        const category = httpCode === '429' ? '🚫 Rate limited (429)'
          : httpCode === '403' ? '🔒 Forbidden (403)'
          : httpCode === '404' ? '🔍 Not found (404)'
          : msg.includes('timeout') || msg.includes('abort') ? '⏱️ Timeout'
          : msg.includes('ECONNREFUSED') ? '🔌 Connection refused'
          : `❌ Lỗi (${httpCode ?? 'network'})`

        addLog(jobId, `  ${category} — Ch.${ch.num}: ${msg.slice(0, 120)}`)
        errorLog.push({ chapterNum: ch.num, url: ch.url, error: `${category}: ${msg}`, attempts: 3 })
        failed.push(ch.num)
        updateJob(jobId, { failedChapters: failed })
      }
    }, batchDelay, jobId)

    // Nếu bị cancel → ghi những chương đã crawl được và kết thúc
    if (isCancelled(jobId)) {
      addLog(jobId, `🛑 Đã dừng — ghi ${chaptersToBatchInsert.length} chương đã crawl vào DB...`)
    }

    // 7. Bulk write to DB (createMany for new + update for existing)
    if (chaptersToBatchInsert.length > 0) {
      addLog(jobId, `💾 Ghi ${chaptersToBatchInsert.length} chương vào DB...`)
      const newChapters = chaptersToBatchInsert.filter(c => !existingMap.has(c.chapterNum))
      const updateChapters = chaptersToBatchInsert.filter(c => existingMap.has(c.chapterNum))

      if (newChapters.length > 0) {
        await prisma.chapter.createMany({ data: newChapters, skipDuplicates: true })
      }
      // Update existing chapters in parallel batches of 10
      if (updateChapters.length > 0) {
        await processInBatches(updateChapters, 10, async (ch) => {
          await prisma.chapter.update({
            where: { storyId_chapterNum: { storyId: story.id, chapterNum: ch.chapterNum } },
            data: { content: ch.content, wordCount: ch.wordCount, title: ch.title },
          })
        }, 0)
      }
      addLog(jobId, `✅ DB: ${newChapters.length} mới + ${updateChapters.length} cập nhật`)

      // Invalidate Next.js cache so new chapters show immediately on frontend
      try {
        revalidatePath(`/truyen/${slug}`)
        revalidatePath(`/truyen/${slug}`, 'page')
        revalidatePath('/truyen', 'page')
        revalidatePath('/', 'page')
        addLog(jobId, `🔄 Cache cleared: /truyen/${slug}`)
      } catch { /* revalidatePath may fail in some environments */ }
    }

    // 8. Final summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
    const summary = [
      `🎉 Hoàn thành sau ${totalTime}s`,
      `📊 Import: ${imported} | Bỏ qua: ${skipped.length} | Thất bại: ${failed.length}/${totalInRange}`,
      `🔗 /admin/truyen/${story.id}`,
    ]

    if (failed.length > 0) {
      const failGroups: Record<string, number[]> = {}
      errorLog.forEach(e => {
        const cat = e.error.split(' — ')[0]
        if (!failGroups[cat]) failGroups[cat] = []
        failGroups[cat].push(e.chapterNum)
      })
      summary.push(`❌ Chi tiết lỗi:`)
      Object.entries(failGroups).forEach(([cat, nums]) => {
        summary.push(`   ${cat}: ch.[${nums.slice(0, 10).join(', ')}${nums.length > 10 ? `... +${nums.length - 10}` : ''}]`)
      })
    }

    summary.forEach(s => addLog(jobId, s))
    updateJob(jobId, {
      status: failed.length > 0 && imported === 0 ? 'failed' : 'completed',
      failedChapters: failed, skippedChapters: skipped, importedChapters: imported + skipped.length
    })

  } catch (e: any) {
    addLog(jobId, `💥 Lỗi nghiêm trọng: ${e?.message}`)
    updateJob(jobId, { status: 'failed', error: e?.message })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const {
    url, fromChapter = 1, toChapter = 9999,
    batchDelay = 400, overwrite = false,
    concurrency = 5,
  } = body

  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 })

  const jobId = randomUUID()
  createJob(jobId, { url, fromChapter, toChapter })

  runCrawlJob(jobId, url, fromChapter, toChapter, batchDelay, overwrite, concurrency).catch(() => {})

  return NextResponse.json({ jobId }, { status: 202 })
}
