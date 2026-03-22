import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Temporary debug endpoint - DELETE after testing
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { url } = await req.json()
  const BASE = 'https://metruyenchu.com.vn'
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,*/*',
    'Accept-Language': 'vi-VN,vi;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': url,
  }

  try {
    // 1. Fetch story page
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) })
    const html = await r.text()

    // 2. Try all storyId extraction patterns
    const patterns = {
      'page(N': html.match(/page\(\s*(\d+)/),
      'page(N,': html.match(/page\((\d+)\s*,/),
      'listchap/N': html.match(/listchap\/(\d+)/),
      'data-id="N"': html.match(/data-id="(\d+)"/),
      'story_id:N': html.match(/story_id['":\s]+(\d+)/),
      'bookId:N': html.match(/bookId['":\s]+(\d+)/),
      '"id":N': html.match(/"id"\s*:\s*(\d+)/),
    }

    const found: Record<string, string | null> = {}
    for (const [key, match] of Object.entries(patterns)) {
      found[key] = match ? match[1] : null
    }

    // 3. Collect all numbers near 'page' or 'chap' in script tags
    const scriptNums: string[] = []
    const scripts = html.match(/<script[^>]*>([\s\S]{5,2000}?)<\/script>/g) || []
    for (const s of scripts) {
      if (s.includes('chapter') || s.includes('chap') || s.includes('listchap')) {
        const nums = s.match(/\b(\d{3,8})\b/g) || []
        scriptNums.push(...nums.slice(0, 10))
        // Show the script
        found['script_' + scriptNums.length] = s.replace(/\s+/g, ' ').slice(0, 300)
      }
    }

    // 4. Test first storyId found
    const storyId = Object.values(patterns).find(v => v !== null)?.[1]

    let apiResult: any = null
    if (storyId) {
      const slug = new URL(url).pathname.replace('/', '')
      const apiUrl = `${BASE}/get/listchap/${storyId}?page=1`
      try {
        const ar = await fetch(apiUrl, { headers: HEADERS, signal: AbortSignal.timeout(10000) })
        const aText = await ar.text()
        let aJson: any = null
        try { aJson = JSON.parse(aText) } catch { aJson = { raw: aText.slice(0, 500) } }
        apiResult = {
          status: ar.status,
          contentType: ar.headers.get('content-type'),
          json: aJson,
          chapterLinks: (aText.match(/chuong-\d+-/g) || []).length,
        }
      } catch (e: any) {
        apiResult = { error: e.message }
      }

      // Also try slug directly
      const apiUrl2 = `${BASE}/get/listchap/${slug}?page=1`
      const ar2 = await fetch(apiUrl2, { headers: HEADERS, signal: AbortSignal.timeout(10000) }).catch(() => null)
      if (ar2) {
        const t2 = await ar2.text()
        found['slug_api_status'] = String(ar2.status)
        found['slug_api_links'] = String((t2.match(/chuong-\d+-/g) || []).length)
      }
    }

    return NextResponse.json({
      patterns: found,
      storyId,
      scriptNums: Array.from(new Set(scriptNums)),
      apiResult,
      htmlLength: html.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
