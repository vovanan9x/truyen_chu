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

// Next-page selectors — ordered by specificity (most specific first)
const NEXT_PAGE_SELECTORS = [
  'a[rel="next"]',
  // Explicit Next buttons (text or aria)
  '.pagination a:contains("Trang tiếp")',
  '.pagination a:contains("Trang sau")',
  '.pagination a[aria-label*="Next"]',
  '.pagination a[aria-label*="ext"]', // next
  // Specific glyphicon or icon classes for Next
  '.pagination a:has(.glyphicon-menu-right)',
  '.pagination a:has(i.fa-angle-right)',
  '.pagination a:has(i.fa-chevron-right)',
  // Generic pagination classes
  '.pagination .next a',
  '.pagination li.next a',
  'li.next a',
  '.pager-next a',
  'a.next-page',
]

/**
 * Build paginated URLs using common URL patterns as fallback.
 * Returns array of candidate URLs to try for page N.
 */
function buildPageUrlCandidates(base: string, page: number): string[] {
  if (page === 1) return [base]
  // Ensure trailing slash before query string
  const withSlash = base.endsWith('/') ? base : base + '/'
  const withoutSlash = base.replace(/\/$/, '')
  return [
    `${withSlash}?page=${page}`,          // e.g. /danh-sach/truyen-moi/?page=2
    `${withoutSlash}/trang-${page}/`,      // e.g. /danh-sach/truyen-moi/trang-2/
    `${withoutSlash}/page/${page}/`,
    `${withoutSlash}?page=${page}`,
  ]
}

/**
 * Get next-page URL from HTML pagination links.
 */
function getNextPageFromHtml(
  $: ReturnType<typeof cheerio.load>,
  currentUrl: string,
  origin: string
): string | null {

  for (const sel of NEXT_PAGE_SELECTORS) {
    try {
      // For :has() selector which might fail in older cheerio, we wrap in try-catch
      // But we can also check text manually if needed
      const el = $(sel).first()
      let href = el.attr('href')
      
      // If we didn't find href using the selector, let's try finding the icon manually
      if (!href && sel.includes(':has')) {
        const iconSel = sel.match(/:has\((.*?)\)/)?.[1]
        if (iconSel) {
          href = $(iconSel).closest('a').attr('href')
        }
      }

      if (!href || href === '#' || href.startsWith('javascript')) continue
      const resolved = href.startsWith('http') ? href : new URL(href, currentUrl).toString()
      const u = new URL(resolved)
      if (u.origin !== origin) continue
      if (resolved === currentUrl) continue
      return resolved
    } catch { continue }
  }
  return null
}

/**
 * Extract story URLs from a loaded page.
 */
function extractStoriesFromPage(
  $: ReturnType<typeof cheerio.load>,
  pageUrl: string,
  origin: string,
  categoryPathSegments: string[],
  storyListSel: string | null
): string[] {
  const found: string[] = []

  function tryHref(href: string | undefined): void {
    if (!href) return
    if (EXCLUDE_PATTERNS.some(p => p.test(href))) return
    let abs: string
    try {
      abs = href.startsWith('http') ? href : new URL(href, pageUrl).toString()
    } catch { return }
    const u = new URL(abs)
    if (u.origin !== origin) return
    const pathParts = u.pathname.split('/').filter(Boolean)
    if (pathParts.length !== 1) return
    const slug = pathParts[0]
    if (EXCLUDE_SLUGS.has(slug)) return
    if (categoryPathSegments.includes(slug)) return
    if (slug.includes('.')) return
    if (!/^[a-zA-Z0-9\u00C0-\u024F-]+$/.test(slug)) return
    const clean = `${origin}/${slug}`
    if (!found.includes(clean)) found.push(clean)
  }

  if (storyListSel) {
    $(storyListSel).each((_, el) => {
      const href = $(el).is('a') ? $(el).attr('href') : $(el).find('a').first().attr('href')
      tryHref(href)
    })
  } else {
    $('a[href]').each((_, el) => tryHref($(el).attr('href')))
  }

  return found
}

/**
 * Scrape story list from a category/listing page.
 * Uses HTML next-page links with URL pattern fallback.
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

  // Look up site config (wrapped in try-catch for DB schema resilience)
  const domain = new URL(categoryUrl).hostname.replace(/^www\./, '')
  let storyListSel: string | null = null
  try {
    const siteConfig = await prisma.siteConfig.findUnique({ where: { domain } })
    storyListSel = (siteConfig as any)?.storyListSel as string | null ?? null
    // NOTE: nextPageSel is for chapter list pagination, NOT used here
  } catch { /* DB schema mismatch — proceed without site config */ }

  const storyUrls: string[] = []
  let currentUrl: string = categoryUrl
  let pagesScanned = 0

  while (pagesScanned < maxPages && storyUrls.length < maxStories) {
    try {
      const html = await fetchUrl(currentUrl, 12000)
      const $ = cheerio.load(html)

      const found = extractStoriesFromPage($, currentUrl, origin, categoryPathSegments, storyListSel)
      const before = storyUrls.length
      for (const url of found) {
        if (!storyUrls.includes(url) && storyUrls.length < maxStories) storyUrls.push(url)
      }

      pagesScanned++

      // Stop if we've hit the limit
      if (storyUrls.length >= maxStories) break

      // 1. Try HTML next-page link
      let nextUrl = getNextPageFromHtml($, currentUrl, origin)

      // 2. Fallback: try URL pattern candidates
      if (!nextUrl) {
        const candidates = buildPageUrlCandidates(categoryUrl, pagesScanned + 1)
        for (const candidate of candidates) {
          if (candidate !== currentUrl) {
            nextUrl = candidate
            break
          }
        }
      }

      if (!nextUrl) break

      // Verify next URL would make progress (skip if same as current)
      if (nextUrl === currentUrl) break

      // Stop if no new stories were found (past end of list)
      if (storyUrls.length === before && pagesScanned > 2) break

      currentUrl = nextUrl
      await new Promise(r => setTimeout(r, 200))
    } catch {
      if (pagesScanned === 0) {
        return NextResponse.json({ error: `Không thể tải trang: ${currentUrl}` }, { status: 500 })
      }
      break
    }
  }

  return NextResponse.json({
    storyUrls,
    total: storyUrls.length,
    pagesScanned,
    usedSelector: storyListSel ?? '(generic)',
  })
}
