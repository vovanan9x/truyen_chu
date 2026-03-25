import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as cheerio from 'cheerio'
import { fetchUrl } from '@/lib/crawl-adapters'
import { prisma } from '@/lib/prisma'

// Allow up to 5 minutes for large category scans (1000+ pages)
export const maxDuration = 300

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

// Common next-page selectors used by Vietnamese novel sites
const NEXT_PAGE_SELECTORS = [
  'a[rel="next"]',
  '.pagination .next a',
  'li.next a',
  '.pager-next a',
  'a.next-page',
  // text-based
  'a:contains("Trang kế")',
  'a:contains("Tiếp")',
  'a:contains("›"):last',
  'a:contains("»"):last',
  '.pagination a[aria-label*="ext"]',
  // truyenfull-specific
  '.page-link[aria-label="Next"]',
  'ul.pagination li:last-child a',
]

/**
 * Scrape story list from a category/listing page.
 * Follows actual next-page links from HTML instead of guessing URL patterns.
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

  // Look up site config for this domain (wrapped in try-catch in case DB schema is behind)
  const domain = new URL(categoryUrl).hostname.replace(/^www\./, '')
  let storyListSel: string | null = null
  let nextPageSel: string | null = null
  try {
    const siteConfig = await prisma.siteConfig.findUnique({ where: { domain } })
    storyListSel = (siteConfig as any)?.storyListSel as string | null ?? null
    nextPageSel = siteConfig?.nextPageSel ?? null
  } catch { /* DB schema mismatch — proceed without site config */ }

  const storyUrls: string[] = []

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

  function getNextPageUrl($: ReturnType<typeof cheerio.load>, currentUrl: string): string | null {
    // Try site-configured selector first
    const selectors = nextPageSel
      ? [nextPageSel, ...NEXT_PAGE_SELECTORS]
      : NEXT_PAGE_SELECTORS

    for (const sel of selectors) {
      try {
        const el = $(sel).first()
        const href = el.attr('href')
        if (!href || href === '#' || href.includes('javascript')) continue

        const resolved = href.startsWith('http') ? href : new URL(href, currentUrl).toString()

        // Must differ from current page and same origin
        const u = new URL(resolved)
        if (u.origin !== origin) continue
        if (resolved === currentUrl) continue

        return resolved
      } catch { continue }
    }
    return null
  }

  // Scrape pages following actual next-page links
  let pageUrl: string | null = categoryUrl
  let page = 0

  while (pageUrl && page < maxPages && storyUrls.length < maxStories) {
    page++
    const currentUrl = pageUrl
    pageUrl = null // reset — will be set from next-page link

    try {
      const html = await fetchUrl(currentUrl, 12000)
      const $ = cheerio.load(html)

      const found: string[] = []

      if (storyListSel) {
        // Use configured selector — precise extraction
        $(storyListSel).each((_, el) => {
          const href = $(el).is('a') ? $(el).attr('href') : $(el).find('a').first().attr('href')
          const url = extractStoryUrl(href ?? '', currentUrl)
          if (url && !found.includes(url)) found.push(url)
        })
      } else {
        // Generic: scan all <a href> links
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') ?? ''
          const url = extractStoryUrl(href, currentUrl)
          if (url && !found.includes(url)) found.push(url)
        })
      }

      const before = storyUrls.length
      for (const url of found) {
        if (!storyUrls.includes(url) && storyUrls.length < maxStories) {
          storyUrls.push(url)
        }
      }

      // Get next page URL from actual HTML navigation
      const nextUrl = getNextPageUrl($, currentUrl)

      // Stop conditions
      if (storyUrls.length >= maxStories) break
      if (!nextUrl) break
      if (storyUrls.length === before && page > 1) break // No new stories on this page

      pageUrl = nextUrl
      await new Promise(r => setTimeout(r, 200))
    } catch {
      if (page === 1) {
        return NextResponse.json({ error: `Không thể tải trang: ${currentUrl}` }, { status: 500 })
      }
      break
    }
  }

  return NextResponse.json({
    storyUrls,
    total: storyUrls.length,
    pagesScanned: page,
    usedSelector: storyListSel ?? null,
  })
}
