import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as cheerio from 'cheerio'
import { fetchUrl } from '@/lib/crawl-adapters'
import { prisma } from '@/lib/prisma'

const EXCLUDE_SLUGS = new Set([
  'the-loai','tac-gia','tim-kiem','dang-nhap','dang-ky',
  'lich-su','bang-xep-hang','hoan-thanh','contact','tos',
  'favicon.ico','robots.txt','sitemap.xml','api',
  'danh-sach','truyen-moi','truyen-hot','truyen-hoan-thanh',
  'category','genre','tag','search','login','register',
])

const EXCLUDE_PATTERNS = [
  /^#/, /^javascript/, /^mailto/, /^tel/,
  /\.(jpg|jpeg|png|gif|webp|svg|css|js|ico)$/i,
]

/**
 * Scrape story list from a category/listing page.
 * Uses site config's storyListSel if available, falls back to generic link scanning.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { categoryUrl, maxPages = 3, maxStories = 200 } = await req.json()
  if (!categoryUrl) return NextResponse.json({ error: 'Missing categoryUrl' }, { status: 400 })

  let origin: string
  let categoryPathSegments: string[]
  try {
    const u = new URL(categoryUrl)
    origin = u.origin
    categoryPathSegments = u.pathname.split('/').filter(Boolean)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Look up site config for this domain
  const domain = new URL(categoryUrl).hostname.replace(/^www\./, '')
  const siteConfig = await prisma.siteConfig.findUnique({ where: { domain } })
  const storyListSel = (siteConfig as any)?.storyListSel as string | null ?? null

  const storyUrls: string[] = []

  // Build paginated URL — try common VN novel site patterns
  function buildPageUrl(base: string, page: number): string {
    if (page === 1) return base
    const b = base.replace(/\/$/, '')
    // Try ?page=N style (metruyenchu) or /trang-N/ style (truyenfull)
    return b.includes('?') ? `${b}&page=${page}` : `${b}/trang-${page}/`
  }

  function extractStoryUrl(href: string, pageUrl: string): string | null {
    if (!href) return null
    if (EXCLUDE_PATTERNS.some(p => p.test(href))) return null

    let abs: string
    try {
      abs = href.startsWith('http') ? href : new URL(href, pageUrl).toString()
    } catch { return null }

    const u = new URL(abs)
    if (u.origin !== origin) return null

    const pathParts = u.pathname.split('/').filter(Boolean)
    if (pathParts.length !== 1) return null

    const slug = pathParts[0]
    if (EXCLUDE_SLUGS.has(slug)) return null
    if (categoryPathSegments.includes(slug)) return null
    if (slug.includes('.')) return null
    if (!/^[a-zA-Z0-9\u00C0-\u024F-]+$/.test(slug)) return null

    return `${origin}/${slug}`
  }

  // Scrape pages
  for (let page = 1; page <= maxPages && storyUrls.length < maxStories; page++) {
    const pageUrl = buildPageUrl(categoryUrl, page)
    try {
      const html = await fetchUrl(pageUrl, 12000)
      const $ = cheerio.load(html)

      const found: string[] = []

      if (storyListSel) {
        // Use configured selector — precise extraction
        $(storyListSel).each((_, el) => {
          const href = $(el).is('a') ? $(el).attr('href') : $(el).find('a').first().attr('href')
          const url = extractStoryUrl(href ?? '', pageUrl)
          if (url && !found.includes(url)) found.push(url)
        })
      } else {
        // Generic: scan all <a href> links
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') ?? ''
          const url = extractStoryUrl(href, pageUrl)
          if (url && !found.includes(url)) found.push(url)
        })
      }

      const before = storyUrls.length
      for (const url of found) {
        if (!storyUrls.includes(url) && storyUrls.length < maxStories) {
          storyUrls.push(url)
        }
      }

      // Stop if no new stories found (end of list)
      if (storyUrls.length === before && page > 1) break

      if (page < maxPages) await new Promise(r => setTimeout(r, 500))
    } catch {
      if (page === 1) {
        return NextResponse.json({ error: `Không thể tải trang: ${pageUrl}` }, { status: 500 })
      }
      break
    }
  }

  return NextResponse.json({
    storyUrls,
    total: storyUrls.length,
    usedSelector: storyListSel ?? null,
  })
}
