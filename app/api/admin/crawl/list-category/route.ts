import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const EXCLUDE_SLUGS = new Set([
  'the-loai','tac-gia','tim-kiem','dang-nhap','dang-ky',
  'lich-su','bang-xep-hang','hoan-thanh','contact','tos',
  'favicon.ico','robots.txt','sitemap.xml','api',
])

/**
 * Scrape story list from a category/listing page
 * Returns clean story URLs with their original domain
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { categoryUrl, maxPages = 3, maxStories = 50 } = await req.json()
  if (!categoryUrl) return NextResponse.json({ error: 'Missing categoryUrl' }, { status: 400 })

  let origin: string
  try {
    origin = new URL(categoryUrl).origin
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  const storyUrls: string[] = []
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,*/*',
  }

  // Scrape pages
  for (let page = 1; page <= maxPages && storyUrls.length < maxStories; page++) {
    const pageUrl = page === 1 ? categoryUrl : `${categoryUrl}?page=${page}`
    try {
      const res = await fetch(pageUrl, { headers, signal: AbortSignal.timeout(10000) })
      if (!res.ok) break
      const html = await res.text()

      // Extract story slugs: single-segment paths in href
      const hrefs = [
        ...Array.from(html.matchAll(/href="([^\/\s][^"]*|\/[^"]*)"/g)).map(m => m[1]),
        ...Array.from(html.matchAll(/href='([^\/\s][^']*|\/[^']*)'>/g)).map(m => m[1]),
      ]

      const pageStories = Array.from(new Set(hrefs)).filter(href => {
        const parts = href.split('/').filter(Boolean)
        if (parts.length !== 1) return false
        const slug = parts[0]
        if (EXCLUDE_SLUGS.has(slug) || slug.includes('.')) return false
        if (!/^[a-z0-9-]+$/.test(slug)) return false
        return true
      }).map(slug => `${origin}/${slug}`)

      const before = storyUrls.length
      for (const url of pageStories) {
        if (!storyUrls.includes(url) && storyUrls.length < maxStories) {
          storyUrls.push(url)
        }
      }

      // Stop if no new stories found (end of list)
      if (storyUrls.length === before && page > 1) break

      // Polite delay between pages
      if (page < maxPages) await new Promise(r => setTimeout(r, 500))
    } catch {
      break
    }
  }

  return NextResponse.json({ storyUrls, total: storyUrls.length })
}
