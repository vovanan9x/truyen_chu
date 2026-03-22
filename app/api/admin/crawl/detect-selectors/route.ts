import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { fetchUrl } from '@/lib/crawl-adapters'
import * as cheerio from 'cheerio'

// Candidates to try for each field, in priority order
const TITLE_CANDIDATES = [
  'h3.title', 'h1.title', '[itemprop="name"]', '.title-book', '.story-title',
  'h1.truyen-title', '.book-detail h1', '.book-name', 'h1', 'h2.title',
]
const AUTHOR_CANDIDATES = [
  '[itemprop="author"] a', '.author a', '.info-holder .author a',
  'a[href*="tac-gia"]', 'a[href*="author"]', '.author-name',
  '.info-row:contains("Tác giả") a', '.detail-info a[href*="tac-gia"]',
  '[class*="author"] a',
]
const COVER_CANDIDATES = [
  '[itemprop="image"]', 'div.book img', '.book-cover img', '.story-cover img',
  'img.book-img', '.cover img', 'img[alt*="cover"]', 'img.lazy',
  '.thumbnail img', '.book img',
]
const DESC_CANDIDATES = [
  '#truyen-intro', '.desc-text', '[itemprop="description"]',
  '.summary-content', '.story-detail .summary', '.description',
  '.book-intro', '.synopsys', '.content-intro',
]
const GENRE_CANDIDATES = [
  'a[href*="the-loai"]', 'a[href*="genre"]', '[itemprop="genre"]',
  '.list-genre a', '.category a', '.info-row:contains("Thể loại") a',
  '.detail-info a[href*="loai"]', 'a[href*="category"]',
]
const CHAPTER_LIST_CANDIDATES = [
  'ul.list-chapter li a', '.list-chapter a', '#list-chapter a',
  '.chapter-list a', '.scrollable-list a', 'table a[href*="chuong"]',
  '.list-chapters a', 'a[href*="chuong-"]', 'a[href*="chapter-"]',
]
const CHAPTER_CONTENT_CANDIDATES = [
  '#chapter-c', '.chapter-c', '#chapter_content', '[id*="chapter-c"]',
  '.chapter-content', '#chapter-content', '.content-chapter',
  '.reading-content', 'article.chapter', '.text-content', 'article',
]
const NEXT_PAGE_CANDIDATES = [
  '.pagination .next a', 'a[rel="next"]', '.pagination li.active + li a',
  '.pag-next a', '[class*="next-page"] a', '.btn-next',
]

function findBestSelector(
  $: cheerio.CheerioAPI,
  candidates: string[],
  validate?: (el: cheerio.Cheerio<any>) => boolean
): string | undefined {
  for (const sel of candidates) {
    try {
      const el = $(sel).first()
      if (el.length > 0) {
        if (!validate || validate(el)) return sel
      }
    } catch {
      // Invalid selector, skip
    }
  }
  return undefined
}

function findBestListSelector(
  $: cheerio.CheerioAPI,
  candidates: string[],
  minCount = 2
): string | undefined {
  let best: string | undefined
  let bestCount = 0
  for (const sel of candidates) {
    try {
      const count = $(sel).length
      if (count >= minCount && count > bestCount) {
        best = sel; bestCount = count
      }
    } catch {
      // skip
    }
  }
  return best
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 })

  // Fetch story page HTML
  let html: string
  try {
    html = await fetchUrl(url, 15000)
  } catch (e: any) {
    return NextResponse.json({ error: `Không thể tải trang: ${e?.message}` }, { status: 400 })
  }

  const $ = cheerio.load(html)

  // Try to find the best selector for each field
  const titleSelector = findBestSelector($, TITLE_CANDIDATES,
    (el) => el.text().trim().length > 2 && el.text().trim().length < 200)

  const authorSelector = findBestSelector($, AUTHOR_CANDIDATES,
    (el) => el.text().trim().length > 1)

  const coverSelector = findBestSelector($, COVER_CANDIDATES,
    (el) => !!(el.attr('src') || el.attr('data-src') || el.attr('data-lazy')))

  const descSelector = findBestSelector($, DESC_CANDIDATES,
    (el) => el.text().trim().length > 20)

  const genreSelector = findBestListSelector($, GENRE_CANDIDATES, 1)

  const chapterListSel = findBestListSelector($, CHAPTER_LIST_CANDIDATES, 2)

  const nextPageSel = findBestSelector($, NEXT_PAGE_CANDIDATES,
    (el) => !!el.attr('href'))

  // For chapter content — we need to fetch a chapter page
  // Try to find a sample chapter URL from the chapter list
  let chapterContentSel: string | undefined
  let chapterTitleSel: string | undefined
  let sampleChapterUrl: string | undefined

  if (chapterListSel) {
    const firstChapterHref = $(chapterListSel).first().attr('href')
    if (firstChapterHref) {
      try {
        const base = new URL(url)
        sampleChapterUrl = firstChapterHref.startsWith('http')
          ? firstChapterHref
          : `${base.origin}${firstChapterHref}`

        const chHtml = await fetchUrl(sampleChapterUrl, 10000)
        const $ch = cheerio.load(chHtml)

        chapterContentSel = findBestSelector($ch, CHAPTER_CONTENT_CANDIDATES,
          (el) => el.text().trim().length > 100)

        // Title selector on chapter page
        const CHAPTER_TITLE_CANDIDATES = [
          '.chapter-title', 'h2.chapter-title', 'h1.chapter-title',
          '.truyen-title', '[class*="chapter-title"]', 'h2', 'h3', '.title'
        ]
        chapterTitleSel = findBestSelector($ch, CHAPTER_TITLE_CANDIDATES,
          (el) => el.text().toLowerCase().includes('chương') || el.text().toLowerCase().includes('chapter'))
      } catch {
        // Could not load chapter, skip
      }
    }
  }

  // Build preview values for what was detected
  const preview: Record<string, string> = {}
  if (titleSelector) preview.title = $(titleSelector).first().text().trim().slice(0, 100)
  if (authorSelector) preview.author = $(authorSelector).first().text().trim().slice(0, 80)
  if (coverSelector) preview.cover = ($(coverSelector).first().attr('src') || $(coverSelector).first().attr('data-src') || '').slice(0, 200)
  if (descSelector) preview.description = $(descSelector).first().text().trim().slice(0, 200) + '...'
  if (genreSelector) preview.genres = $(genreSelector).map((_, el) => $(el).text().trim()).get().slice(0, 5).join(', ')
  if (chapterListSel) preview.chapterCount = `${$(chapterListSel).length} chương tìm thấy`

  return NextResponse.json({
    detected: {
      titleSelector,
      authorSelector,
      coverSelector,
      descSelector,
      genreSelector,
      chapterListSel,
      chapterContentSel,
      chapterTitleSel,
      nextPageSel,
    },
    preview,
    sampleChapterUrl,
  })
}
