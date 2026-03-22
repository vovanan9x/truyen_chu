import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as cheerio from 'cheerio'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9',
  'Cache-Control': 'no-cache',
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

// Parse a single chapter page from TruyenFull
async function fetchChapterContent(url: string): Promise<string> {
  const html = await fetchPage(url)
  const $ = cheerio.load(html)
  return $('#chapter-c, .chapter-c, [id*="chapter-c"]').text().trim()
    || $('.box-chapter, .chapter-content').text().trim()
    || ''
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { url, fromChapter = 1, toChapter = 999 } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 })

  const logs: string[] = []
  const addLog = (msg: string) => logs.push(`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`)

  try {
    // 1. Fetch story index page
    addLog(`📥 Đang tải trang truyện: ${url}`)
    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    // Parse story info
    const title = $('h3.title, [itemprop="name"], h1').first().text().trim()
    const author = $('[itemprop="author"], a[href*="tac-gia"]').first().text().trim()
    const description = $('#truyen-intro p, .desc-text p, [itemprop="description"]').first().text().trim()
    let coverUrl = $('[itemprop="image"], div.book img, img.lazy').first().attr('src')
      || $('img.lazy').first().attr('data-src') || ''
    if (coverUrl?.startsWith('//')) coverUrl = 'https:' + coverUrl

    if (!title) {
      return NextResponse.json({ error: 'Không đọc được thông tin truyện', logs }, { status: 400 })
    }

    addLog(`📖 Tên truyện: ${title}`)

    // 2. Check if story exists, create it if not
    const slug = title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      + `-${Date.now().toString(36)}`

    addLog(`💾 Tạo truyện với slug: ${slug}`)
    const story = await prisma.story.upsert({
      where: { slug },
      update: {},
      create: {
        title, slug, author: author || null, description: description || null,
        coverUrl: coverUrl || null, status: 'ONGOING', sourceUrl: url,
      },
    })

    // 3. Collect all chapter links
    const chapterLinks: { num: number; url: string }[] = []
    $('ul.list-chapter li a, .list-chapter a').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      const text = $(el).attr('title') || $(el).text().trim()
      const matchText = text.match(/chương\s*(\d+)/i)
      const matchHref = href.match(/chuong-(\d+)/i)
      const match = matchText || matchHref
      if (match) {
        const num = parseInt(match[1])
        if (num >= fromChapter && num <= toChapter) {
          chapterLinks.push({ num, url: href.startsWith('http') ? href : `https://truyenfull.vision${href}` })
        }
      }
    })

    chapterLinks.sort((a, b) => a.num - b.num)
    const toImport = chapterLinks.slice(0, Math.min(chapterLinks.length, toChapter - fromChapter + 1))

    addLog(`📋 Tìm thấy ${toImport.length} chương cần import (${fromChapter}→${toChapter})`)

    if (toImport.length === 0) {
      return NextResponse.json({
        success: true, chaptersImported: 0,
        logs: [...logs, '⚠️ Không tìm thấy chương nào trong phạm vi chỉ định']
      })
    }

    // 4. Import chapters (limit to 50 at a time to avoid timeout)
    const batchSize = Math.min(toImport.length, 20)
    let imported = 0

    for (let i = 0; i < batchSize; i++) {
      const ch = toImport[i]
      try {
        const content = await fetchChapterContent(ch.url)
        const wordCount = content.split(/\s+/).length

        await prisma.chapter.upsert({
          where: { storyId_chapterNum: { storyId: story.id, chapterNum: ch.num } },
          update: { content, wordCount },
          create: {
            storyId: story.id, chapterNum: ch.num, content,
            wordCount, isLocked: false, coinCost: 0,
          },
        })
        imported++
        addLog(`✅ Chương ${ch.num} (${wordCount} chữ)`)
      } catch (e: any) {
        addLog(`❌ Chương ${ch.num}: ${e?.message ?? 'Lỗi'}`)
      }

      // Small delay to avoid rate limiting
      if (i < batchSize - 1) await new Promise(r => setTimeout(r, 500))
    }

    if (toImport.length > batchSize) {
      addLog(`⚠️ Chỉ import ${batchSize} chương đầu. Import thêm bằng cách chạy lại với fromChapter=${fromChapter + batchSize}`)
    }

    addLog(`🎉 Hoàn thành! Import ${imported}/${batchSize} chương thành công`)
    addLog(`🔗 Xem truyện: /admin/truyen/${story.id}`)

    return NextResponse.json({
      success: true,
      storyId: story.id,
      chaptersImported: imported,
      logs,
    })

  } catch (e: any) {
    addLog(`💥 Lỗi: ${e?.message}`)
    return NextResponse.json({ error: e?.message ?? 'Lỗi không xác định', logs }, { status: 500 })
  }
}
