import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as cheerio from 'cheerio'
import * as zlib from 'zlib'
import { promisify } from 'util'
import { fetchUrl } from '@/lib/crawl-adapters'
import { prisma } from '@/lib/prisma'

const gunzip = promisify(zlib.gunzip)

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

// ─── Sitemap Mode ──────────────────────────────────────────────────────────────

/**
 * Parse story URLs from a sitemap XML string.
 * Handles: regular XML, gzipped .xml.gz
 * Also handles sitemap index files (which list other sitemaps).
 */
async function fetchSitemapUrls(
  sitemapUrl: string,
  origin: string,
  maxStories: number
): Promise<{ storyUrls: string[]; pagesScanned: number }> {
  const storyUrls: string[] = []
  let pagesScanned = 0

  async function processSitemap(url: string): Promise<void> {
    pagesScanned++
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching sitemap: ${url}`)

    let xml: string
    const contentType = res.headers.get('content-type') ?? ''
    const isGzip = url.endsWith('.gz') || contentType.includes('gzip')

    if (isGzip) {
      const buffer = Buffer.from(await res.arrayBuffer())
      const decompressed = await gunzip(buffer)
      xml = decompressed.toString('utf-8')
    } else {
      xml = await res.text()
    }

    // Check if this is a sitemap index (lists other sitemaps)
    const isSitemapIndex = xml.includes('<sitemapindex')
    if (isSitemapIndex) {
      // Extract child sitemap URLs
      const childMatches = Array.from(xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g))
      const childUrls = childMatches
        .map(m => m[1].trim())
        .filter(u => u.includes('sitemap') || u.endsWith('.xml') || u.endsWith('.xml.gz'))
      for (const childUrl of childUrls) {
        if (storyUrls.length >= maxStories) break
        await processSitemap(childUrl)
      }
      return
    }

    // Regular sitemap — parse <loc> entries
    const locMatches = Array.from(xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g))
    const locs = locMatches.map(m => m[1].trim())
    for (const loc of locs) {
      if (storyUrls.length >= maxStories) break
      try {
        const u = new URL(loc)
        if (u.origin !== origin) continue
        const pathParts = u.pathname.split('/').filter(Boolean)
        if (pathParts.length !== 1) continue
        const slug = pathParts[0]
        if (EXCLUDE_SLUGS.has(slug)) continue
        if (slug.includes('.')) continue
        if (!/^[a-zA-Z0-9\u00C0-\u024F-]+$/.test(slug)) continue
        const clean = `${origin}/${slug}`
        if (!storyUrls.includes(clean)) storyUrls.push(clean)
      } catch { continue }
    }
  }

  await processSitemap(sitemapUrl)
  return { storyUrls, pagesScanned }
}

// ─── Category Scrape Mode ──────────────────────────────────────────────────────

function buildPageUrlCandidates(base: string, page: number): string[] {
  if (page === 1) return [base]
  const withSlash = base.endsWith('/') ? base : base + '/'
  const withoutSlash = base.replace(/\/$/, '')
  return [
    `${withSlash}?page=${page}`,
    `${withoutSlash}/trang-${page}/`,
    `${withoutSlash}/page/${page}/`,
    `${withoutSlash}?page=${page}`,
  ]
}

function getNextPageFromHtml(
  $: ReturnType<typeof cheerio.load>,
  currentUrl: string,
  origin: string
): string | null {
  for (const sel of NEXT_PAGE_SELECTORS) {
    try {
      const el = $(sel).first()
      let href = el.attr('href')

      if (!href && sel.includes(':has')) {
        const iconSel = sel.match(/:has\((.*?)\)/)?.[1]
        if (iconSel) href = $(iconSel).closest('a').attr('href')
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

// ─── Main Route ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { categoryUrl, maxPages = 3, maxStories = 200 } = await req.json()
  if (!categoryUrl) return NextResponse.json({ error: 'Missing categoryUrl' }, { status: 400 })

  let origin: string
  try {
    origin = new URL(categoryUrl).origin
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // ── Sitemap mode ──────────────────────────────
  const isSitemap = /\.(xml|xml\.gz)(\?.*)?$/i.test(categoryUrl)
    || categoryUrl.toLowerCase().includes('sitemap')
  if (isSitemap) {
    try {
      const { storyUrls, pagesScanned } = await fetchSitemapUrls(categoryUrl, origin, maxStories)
      return NextResponse.json({
        storyUrls,
        total: storyUrls.length,
        pagesScanned,
        mode: 'sitemap',
      })
    } catch (e: any) {
      return NextResponse.json({ error: `Lỗi đọc sitemap: ${e?.message}` }, { status: 500 })
    }
  }

  // ── Category scrape mode ──────────────────────
  const categoryPathSegments = new URL(categoryUrl).pathname.split('/').filter(Boolean)
  const domain = new URL(categoryUrl).hostname.replace(/^www\./, '')

  let storyListSel: string | null = null
  try {
    const siteConfig = await prisma.siteConfig.findUnique({ where: { domain } })
    storyListSel = (siteConfig as any)?.storyListSel as string | null ?? null
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

      if (storyUrls.length >= maxStories) break

      let nextUrl = getNextPageFromHtml($, currentUrl, origin)
      if (!nextUrl) {
        const candidates = buildPageUrlCandidates(categoryUrl, pagesScanned + 1)
        for (const candidate of candidates) {
          if (candidate !== currentUrl) { nextUrl = candidate; break }
        }
      }

      if (!nextUrl) break
      if (nextUrl === currentUrl) break
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
    mode: 'scrape',
    usedSelector: storyListSel ?? '(generic)',
  })
}
