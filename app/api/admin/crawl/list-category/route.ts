import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as cheerio from 'cheerio'
import { fetchUrl } from '@/lib/crawl-adapters'

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
  /\?/, // query strings
]

/**
 * Scrape story list from a category/listing page
 * Returns clean story URLs with their original domain
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

  const storyUrls: string[] = []

  // Build paginated URLs — try common pagination patterns
  function buildPageUrl(base: string, page: number): string {
    if (page === 1) return base
    // Remove trailing slash, append page
    const b = base.replace(/\/$/, '')
    return `${b}/trang-${page}/`
  }

  // Scrape pages
  for (let page = 1; page <= maxPages && storyUrls.length < maxStories; page++) {
    const pageUrl = buildPageUrl(categoryUrl, page)
    try {
      const html = await fetchUrl(pageUrl, 10000)
      const $ = cheerio.load(html)

      const found: string[] = []
      $('a[href]').each((_, el) => {
        const raw = $(el).attr('href') ?? ''
        if (!raw) return
        if (EXCLUDE_PATTERNS.some(p => p.test(raw))) return

        // Resolve to absolute URL
        let abs: string
        try {
          abs = raw.startsWith('http') ? raw : new URL(raw, pageUrl).toString()
        } catch { return }

        // Must be same origin
        const u = new URL(abs)
        if (u.origin !== origin) return

        // Parse path: must be single-segment slug (not nested under category)
        const pathParts = u.pathname.split('/').filter(Boolean)
        if (pathParts.length !== 1) return

        const slug = pathParts[0]
        if (EXCLUDE_SLUGS.has(slug)) return
        if (categoryPathSegments.includes(slug)) return
        if (slug.includes('.')) return
        // Slug should look like a story: letters, numbers, hyphens
        if (!/^[a-zA-Z0-9\u00C0-\u024F-]+$/.test(slug)) return

        const cleanUrl = `${origin}/${slug}/`
        if (!found.includes(cleanUrl)) found.push(cleanUrl)
      })

      const before = storyUrls.length
      for (const url of found) {
        if (!storyUrls.includes(url) && storyUrls.length < maxStories) {
          storyUrls.push(url)
        }
      }

      // Stop if no new stories found (end of list)
      if (storyUrls.length === before && page > 1) break

      // Polite delay between pages
      if (page < maxPages) await new Promise(r => setTimeout(r, 500))
    } catch {
      if (page === 1) {
        return NextResponse.json({ error: `Không thể tải trang: ${pageUrl}` }, { status: 500 })
      }
      break
    }
  }

  return NextResponse.json({ storyUrls, total: storyUrls.length })
}
