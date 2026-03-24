/**
 * Site adapters for scraping different novel sites.
 * Supports both hard-coded adapters and dynamic DB-configured selectors.
 */

import * as cheerio from 'cheerio'
import { getCrawlSettings } from './crawl-settings'
import { fetchUrlWithPlaywright, invalidateBypassContext, hasActiveContext, getNextProxyUrl } from './playwright-bypass'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]

function getRandomHeaders(cookies?: string) {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...(cookies ? { 'Cookie': cookies } : {}),
  }
}


// ─── Proxy Agent Pool (undici, built into Node.js 18+) ────────────────────────
// Supports multiple proxies via round-robin.
// Proxy list is read from DB settings (crawl_proxy_list) or single proxy fields.

const _proxyAgentCache = new Map<string, any>()

// Per-origin keepAlive agent pool — reuses TCP connections for same domain
// Avoids 100-300ms TCP+TLS handshake on every chapter fetch
const _keepAliveAgentCache = new Map<string, any>()
async function getKeepAliveAgent(url: string): Promise<any | null> {
  if (await getProxyAgent()) return null // proxy handles its own pooling
  try {
    const origin = new URL(url).origin
    if (!_keepAliveAgentCache.has(origin)) {
      const { Agent } = await import('undici')
      const agent = new Agent({
        keepAliveTimeout: 10_000,    // keep connection alive for 10s after last request
        keepAliveMaxTimeout: 30_000, // max 30s total idle
        connections: 15,             // max concurrent connections per origin
      })
      _keepAliveAgentCache.set(origin, agent)
    }
    return _keepAliveAgentCache.get(origin)
  } catch { return null }
}

async function getProxyAgent(stickyProxyUrl?: string) {
  const settings = await getCrawlSettings()
  const proxyUrl = stickyProxyUrl ?? getNextProxyUrl(settings.proxies)
  if (!proxyUrl) return null

  if (_proxyAgentCache.has(proxyUrl)) return _proxyAgentCache.get(proxyUrl)

  try {
    const { ProxyAgent } = await import('undici')
    const agent = new ProxyAgent(proxyUrl)
    _proxyAgentCache.set(proxyUrl, agent)
    if (settings.proxies.length > 1) {
      console.log(`[Crawler] 🔀 Proxy pool (${settings.proxies.length}), using: ${proxyUrl.replace(/:([^:@]+)@/, ':***@')}`)
    } else {
      console.log('[Crawler] 🔀 Proxy enabled:', proxyUrl.replace(/:([^:@]+)@/, ':***@'))
    }
    return agent
  } catch (e) {
    console.warn('[Crawler] ⚠️ Could not init proxy agent:', e)
    return null
  }
}

export interface StoryInfo {
  title: string
  author: string
  description: string
  coverUrl: string
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS'
  genres: string[]
  totalChapters: number
  sourceUrl: string
}

export interface ChapterRef {
  num: number
  title: string
  url: string
}

export interface SiteAdapter {
  name: string
  matches(url: string): boolean
  fetchStoryInfo(url: string, html: string): StoryInfo
  fetchChapterList(url: string, html: string): { chapters: ChapterRef[]; nextPageUrl?: string }
  fetchChapterContent(url: string, html: string): string
  /** Optional: override full chapter list fetching (e.g. via AJAX API) */
  fetchAllChapters?(storyUrl: string, html: string): Promise<ChapterRef[]>
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

export async function fetchUrl(url: string, timeout = 15000, cookies?: string, stickyProxyUrl?: string): Promise<string> {
  // Helper: do 1 fetch attempt — re-generates headers each call to randomize User-Agent
  async function doFetch(extraCookies?: string): Promise<Response> {
    const h = getRandomHeaders(extraCookies ?? cookies)
    const proxyAgent = await getProxyAgent(stickyProxyUrl)
    if (proxyAgent) {
      const { fetch: undiciFetch } = await import('undici')
      return (undiciFetch as any)(url, { headers: h, signal: AbortSignal.timeout(timeout), redirect: 'follow', dispatcher: proxyAgent })
    }
    // Use keepAlive agent to reuse TCP connections (saves 100-300ms per request on same domain)
    const keepAliveAgent = await getKeepAliveAgent(url)
    if (keepAliveAgent) {
      const { fetch: undiciFetch } = await import('undici')
      return (undiciFetch as any)(url, { headers: h, signal: AbortSignal.timeout(timeout), redirect: 'follow', dispatcher: keepAliveAgent })
    }
    return fetch(url, { headers: h, signal: AbortSignal.timeout(timeout), redirect: 'follow' })
  }

  let res = await doFetch(cookies)

  // On 403 → use Playwright to fetch HTML directly (bypasses TLS fingerprint issue)
  if (res.status === 403) {
    const settings = await getCrawlSettings()
    if (settings.usePlaywright) {
      console.log(`[fetchUrl] 403 from ${url} — using Playwright to fetch HTML directly...`)
      try {
        return await fetchUrlWithPlaywright(url, settings)
      } catch (e: any) {
        await invalidateBypassContext(url)
        throw new Error(`Playwright bypass failed for ${new URL(url).hostname}: ${e?.message}`)
      }
    }
    throw new Error(`HTTP 403 — ${new URL(url).hostname} blocked by Cloudflare (bật Playwright bypass trong Admin → Crawl truyện → Proxy & Bypass)`)
  }

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return res.text()
}

// ─── Helper: extract domain from URL ──────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ─── Helper: extract clean HTML from chapter content ──────────────────────────
// Keeps formatting tags (p, br, strong, em, etc.) but removes all dangerous/noise

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'hr', 'span', 'div',
])

export function extractCleanHtml($el: ReturnType<typeof cheerio.load>, selector: string): string {
  const $ = $el
  const el = $(selector).first()
  if (!el.length) return ''

  // Remove garbage elements
  el.find('script, style, noscript, iframe, object, embed').remove()
  el.find('[class*="ad"], [id*="ad"], [class*="banner"], [class*="social"]').remove()
  el.find('[class*="related"], [class*="recommend"], [class*="comment"], [class*="share"]').remove()
  el.find('nav, header, footer, .breadcrumb, button').remove()

  // Get the inner HTML
  let html = el.html() ?? ''

  // Strip disallowed tags but keep their text content
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tagName) => {
    const tag = tagName.toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ''
    if (tag === 'br') return '<br>'
    return match.replace(/\s+[a-zA-Z-]+="[^"]*"/g, '').replace(/\s+[a-zA-Z-]+='[^']*'/g, '')
  })

  // Normalize whitespace
  html = html
    .replace(/(<br\s*\/?>((\s*<br\s*\/?>){2,}))/gi, '<br><br>')
    .replace(/(<p[^>]*>\s*<\/p>)+/gi, '')
    .replace(/\s{3,}/g, ' ')
    .trim()

  return html
}

// ─── Helper: count words in HTML string ───────────────────────────────────────

export function countWordsInHtml(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
}

// ─── Build a dynamic adapter from DB SiteConfig selectors ─────────────────────

export interface DbSiteConfig {
  domain: string
  name: string
  titleSelector?: string | null
  authorSelector?: string | null
  coverSelector?: string | null
  descSelector?: string | null
  genreSelector?: string | null
  chapterListSel?: string | null
  chapterContentSel?: string | null
  chapterTitleSel?: string | null
  nextPageSel?: string | null
  // Chapter list API config (for AJAX pagination)
  chapterApiUrl?: string | null    // e.g. /get/listchap/{storyId}?page={page}
  storyIdPattern?: string | null   // regex to extract storyId, e.g. page\((\d+)
  chapterApiJson?: string | null   // JSON field name, e.g. "data"
  // Cloudflare / Anti-bot bypass
  cookies?: string | null          // Cookie string: "cf_clearance=xxx; _ga=..."
}

// Per-domain cookie store
const domainCookies = new Map<string, string>()

/** Get cookies for a given URL's domain (for use in route handlers) */
export function getCookiesForDomain(url: string): string | undefined {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '')
    return domainCookies.get(domain) || undefined
  } catch { return undefined }
}

function buildAdapterFromConfig(cfg: DbSiteConfig): SiteAdapter {
  // Register cookies for this domain
  if (cfg.cookies) domainCookies.set(cfg.domain, cfg.cookies)
  else domainCookies.delete(cfg.domain)

  const cookies = cfg.cookies || undefined
  // Cookie-aware fetch for this domain
  const fetch$ = (url: string, timeout = 15000) => fetchUrl(url, timeout, cookies)

  return {
    name: `${cfg.name} (custom)`,
    matches: (url) => extractDomain(url) === cfg.domain,

    // ── Story info ──────────────────────────────────────────────────────────────
    fetchStoryInfo(url, html) {
      const $ = cheerio.load(html)

      let title = ''
      if (cfg.titleSelector) title = $(cfg.titleSelector).first().text().trim()
      if (!title) title = $('h1').first().text().trim()
      if (!title) title = $('meta[property="og:title"]').attr('content')?.split(' - ')[0].trim() ?? ''
      title = title.replace(/\s*[-|]\s*(Đọc Truyện|Truyện Chữ|Novel|[A-Z][a-z]+Chu|TruyenFull).*/i, '').trim()

      let author = ''
      if (cfg.authorSelector) author = $(cfg.authorSelector).first().text().trim()
      if (!author) author = $('[itemprop="author"]').first().text().trim()
      if (!author) author = $('meta[name="author"]').attr('content')?.trim() ?? ''
      if (!author) {
        const m = html.match(/tác giả[^>]*>[^<]*<[^>]+>([^<]{2,60})<\/a>/i)
        author = m?.[1]?.trim() ?? ''
      }

      let description = ''
      if (cfg.descSelector) description = $(cfg.descSelector).first().text().trim()
      if (!description) description = $('meta[property="og:description"]').attr('content')?.trim() ?? ''
      if (!description) description = $('meta[name="description"]').attr('content')?.trim() ?? ''

      let coverUrl = ''
      if (cfg.coverSelector) {
        const el = $(cfg.coverSelector).first()
        coverUrl = el.attr('src') || el.attr('data-src') || el.attr('data-lazy') || el.attr('data-original') || ''
      }
      if (!coverUrl) coverUrl = $('meta[property="og:image"]').attr('content') ?? '';
      if (!coverUrl) {
        ['[class*="cover"] img', '[class*="book"] img', 'figure img'].some(sel => {
          const src = $(sel).first().attr('src') || $(sel).first().attr('data-src') || ''
          if (src) { coverUrl = src; return true }
        })
      }
      if (coverUrl.startsWith('//')) coverUrl = 'https:' + coverUrl
      if (coverUrl && !coverUrl.startsWith('http')) {
        try { coverUrl = new URL(coverUrl, url).toString() } catch { coverUrl = '' }
      }

      const genres: string[] = []

      // 1. Try specific-container selectors first (avoids nav menu pollution)
      const specificSelectors = [
        cfg.genreSelector,                          // DB-configured selector first
        '.li--genres a',                            // metruyenchu.com.vn
        '.detail-genres a',                         // many generic sites
        '.info-genres a',
        'li[class*="genre"] a',
        'ul.info li a[href*="/the-loai/"]',
        '.book-info a[href*="/the-loai/"]',
        '.story-info a[href*="/the-loai/"]',
        '.info a[href*="/the-loai/"]',
        '.detail-info a[href*="/the-loai/"]',
        'table.desc a[href*="/the-loai/"]',
        '[itemprop="genre"]',
      ].filter(Boolean) as string[]

      for (const sel of specificSelectors) {
        const found: string[] = []
        $(sel).each((_, el) => {
          const g = $(el).text().trim()
          if (g && g.length >= 2 && g.length <= 40 && !found.includes(g)) found.push(g)
        })
        if (found.length > 0) {
          found.forEach(g => { if (!genres.includes(g)) genres.push(g) })
          break
        }
      }

      // 2. Broad fallback only if nothing found from specific containers (limit to 12)
      if (genres.length === 0) {
        let count = 0
        $('a[href*="the-loai"], a[href*="/genre/"], a[href*="/category/"]').each((_, el) => {
          if (count >= 12) return false
          const g = $(el).text().trim()
          if (g && g.length >= 2 && g.length <= 35 && !genres.includes(g)) {
            genres.push(g); count++
          }
        })
      }


      const bodyText = $('body').text().toLowerCase()
      const status: StoryInfo['status'] =
        bodyText.includes('hoàn thành') || /\bfull\b/.test(bodyText) || bodyText.includes('đã hoàn') ? 'COMPLETED'
        : bodyText.includes('tạm dừng') || bodyText.includes('hiatus') ? 'HIATUS'
        : 'ONGOING'

      let totalChapters = 0
      if (cfg.chapterListSel) totalChapters = $(cfg.chapterListSel).length
      if (!totalChapters) {
        const countMatch = bodyText.match(/(\d+)\s*chương/)
        if (countMatch) totalChapters = parseInt(countMatch[1])
      }

      return { title, author, description, coverUrl, genres, status, totalChapters, sourceUrl: url }
    },

    // ── Chapter list ────────────────────────────────────────────────────────────
    fetchChapterList(url, html) {
      const $ = cheerio.load(html)
      const chapters: ChapterRef[] = []
      const origin = new URL(url).origin

      /**
       * Extract chapter number from text/URL — position-independent:
       * 1. URL: explicit chuong/chap/chapter + digit
       * 2. Text: if exactly 1 number found → use it
       * 3. Text: if multiple numbers → prefer the one adjacent to a chapter keyword (any order)
       * 4. Text: fallback to first number
       * 5. No number → null (caller uses list index)
       */
      function extractChapNum(text: string, href: string): number | null {
        // 0. Highest priority: title prefix "1: Title" — user-visible sequential number
        //    (Sites like metruyenchu use internal DB IDs in URLs but show seq numbers in title)
        const titlePrefix = text.match(/^(\d+)\s*[:：]/)
        if (titlePrefix) return parseInt(titlePrefix[1])

        // 1. Explicit chapter number in URL
        const urlNum = href.match(/(?:chuong|chapter|chap|tap|ep|phần|phan)[_-](\d+)/i)
        if (urlNum) return parseInt(urlNum[1])

        // 2. Scan all numbers from title
        const t = text.normalize('NFC').trim()
        const allNums = Array.from(t.matchAll(/(\d+)/g))
        if (allNums.length === 0) return null
        if (allNums.length === 1) return parseInt(allNums[0][1])

        // 3. Multiple numbers — find one adjacent to a chapter keyword (before OR after)
        //    e.g. "Vol 2 Chap 31" → 31; "Đệ 31 chương X" → 31; "Arc 1 Chapter 5" → 5
        const kwPattern = /ch[uư][oô]ng|chapter|chap|t[aập]p|tap|ep|h[oồ]i|đ|đệ|đề|ti[eết]t|quy[eể]n|đột/gi
        let bestNum: number | null = null
        let bestDist = Infinity
        for (const kw of Array.from(t.matchAll(kwPattern))) {
          const kwStart = kw.index!
          const kwEnd = kwStart + kw[0].length
          for (const nm of allNums) {
            const nmStart = nm.index!
            const dist = Math.min(Math.abs(nmStart - kwEnd), Math.abs(kwStart - (nmStart + nm[1].length)))
            if (dist < bestDist) {
              bestDist = dist
              bestNum = parseInt(nm[1])
            }
          }
        }
        if (bestNum !== null) return bestNum

        // 4. No keyword found — return first number
        return parseInt(allNums[0][1])
      }

      const sel = cfg.chapterListSel || 'a[href*="chuong"], a[href*="chapter"], a[href*="chap"], a[href*="tap"]'
      const numbered: ChapterRef[] = []
      const unnumbered: { text: string; chUrl: string }[] = []

      $(sel).each((_, el) => {
        const $a = $(el).is('a') ? $(el) : $(el).find('a').first()
        if (!$a.length) return
        const href = $a.attr('href') ?? ''
        if (!href || href.startsWith('#') || href.startsWith('javascript')) return
        const text = $a.attr('title') || $a.text().trim()
        const num = extractChapNum(text, href)
        const chUrl = href.startsWith('http') ? href : href.startsWith('/') ? origin + href : new URL(href, url).toString()

        if (num !== null && num > 0) {
          if (!numbered.find(c => c.num === num)) {
            numbered.push({ num, title: text || `Chương ${num}`, url: chUrl })
          }
        } else if (href) {
          // Chương không có số (thông báo, ngoại truyện...) — thu thập riêng
          if (!unnumbered.find(u => u.chUrl === chUrl)) {
            unnumbered.push({ text: text || href, chUrl })
          }
        }
      })

      // Gán số tuần tự cho chương không có số (đặt sau chương cuối có số)
      const maxNum = numbered.reduce((m, c) => Math.max(m, c.num), 0)
      unnumbered.forEach((u, i) => {
        chapters.push({ num: maxNum + i + 1, title: u.text, url: u.chUrl })
      })
      numbered.forEach(c => chapters.push(c))

      // Next page: use configured selector, or fall back to common patterns
      let nextPageUrl: string | undefined
      const nextEl = cfg.nextPageSel
        ? $(cfg.nextPageSel).first()
        : $('a[rel="next"], .pagination .next a, .pagination a[aria-label*="ext"], li.next a, .pager-next a, a.next-page, a:contains("›"):last, a:contains("»"):last').first()
      const nextHref = nextEl.attr('href')
      if (nextHref && !nextHref.includes('javascript') && nextHref !== '#') {
        const resolved = nextHref.startsWith('http') ? nextHref : origin + nextHref
        // Validate: must differ from current URL and be same domain
        if (resolved !== url && resolved.startsWith(origin)) {
          nextPageUrl = resolved
        }
      }

      chapters.sort((a, b) => a.num - b.num)
      return { chapters, nextPageUrl }
    },

    // ── AJAX chapter list fetcher ───────────────────────────────────────────────
    async fetchAllChapters(storyUrl: string, html: string): Promise<ChapterRef[]> {
      const origin = new URL(storyUrl).origin
      // Collect only chapters belonging to THIS story (prevents sidebar/recommended links pollution)
      const storySlug = new URL(storyUrl).pathname.replace(/^\//, '').split('/')[0]

      // Pattern 1: Config-driven AJAX API
      const apiUrlTemplate = cfg.chapterApiUrl
      if (apiUrlTemplate && apiUrlTemplate.includes('{page}')) {
        let storyId: string | undefined
        if (cfg.storyIdPattern) {
          try {
            const re = new RegExp(cfg.storyIdPattern)
            storyId = html.match(re)?.[1]
          } catch { /* invalid regex */ }
        }
        if (!storyId) {
          storyId = html.match(/['"/]get\/listchap\/(\d+)['"?]/)?.[1]
            || html.match(/listchap\/(\d+)/)?.[1]
            || html.match(/page\s*\(\s*(\d+)/)?.[1]
        }

        if (storyId) {
          const jsonField = cfg.chapterApiJson || 'data'
          // Collect raw chapter links in source order — no number extraction
          const rawChaps: { title: string; chUrl: string }[] = []
          let page = 1
          while (page <= 2000) {
            const apiUrl = (apiUrlTemplate.includes('{storyId}')
              ? apiUrlTemplate.replace('{storyId}', storyId)
              : apiUrlTemplate
            ).replace('{page}', String(page))

            const fullUrl = apiUrl.startsWith('http') ? apiUrl : origin + apiUrl
            try {
              const _ajaxHeaders = {
                  ...getRandomHeaders(cookies),
                  'Accept': 'application/json, text/html, */*',
                  'X-Requested-With': 'XMLHttpRequest',
                  'Referer': storyUrl,
                }
              const _ajaxProxy = await getProxyAgent()
              const _ajaxFetch = _ajaxProxy
                ? async (u: string, opts: any) => { const { fetch: f } = await import('undici'); return (f as any)(u, { ...opts, dispatcher: _ajaxProxy }) }
                : fetch
              const res = await _ajaxFetch(fullUrl, {
                headers: _ajaxHeaders,
                signal: AbortSignal.timeout(10000),
              })
              if (!res.ok) break
              const rawText = await res.text()
              let htmlContent = rawText
              try {
                const json = JSON.parse(rawText)
                const fieldVal = json?.[jsonField]
                if (fieldVal && typeof fieldVal === 'string') htmlContent = fieldVal
              } catch { /* raw HTML */ }
              if (!htmlContent || htmlContent.trim().length < 10) break

              const prevCount = rawChaps.length
              const $$ = cheerio.load(htmlContent)
              $$('a[href]').each((_, el) => {
                const href = $$(el).attr('href') ?? ''
                if (!href.includes('chuong') && !href.includes('chapter') && !href.includes('chap')) return
                if (href === '#' || href.startsWith('javascript')) return
                if (storySlug && !href.includes(storySlug)) return
                const text = $$(el).attr('title') || $$(el).text().trim()
                const chUrl = href.startsWith('http') ? href : href.startsWith('/') ? origin + href : ''
                if (!chUrl) return
                if (rawChaps.find(c => c.chUrl === chUrl)) return // dedup by URL
                rawChaps.push({ title: text || chUrl, chUrl })
              })

              if (page === 1 && rawChaps.length === 0) {
                console.log(`[fetchAllChapters] page1 no chapters (raw ${rawText.length}b): ${rawText.slice(0,300)}`)
              }
              if (rawChaps.length === prevCount && page > 1) break
              page++
              await new Promise(r => setTimeout(r, 300))
            } catch { break }
          }
          if (page > 2000) console.warn(`[fetchAllChapters] Hit 2000-page AJAX limit — story may have more chapters: ${storyUrl}`)
          if (rawChaps.length > 0) {
            // Assign sequential chapter numbers based on position in source list
            return rawChaps.map((c, i) => ({ num: i + 1, title: c.title, url: c.chUrl }))
          }
        }
      }

      // Pattern 2: Standard HTML pagination
      {
        let pageUrl: string | undefined = storyUrl
        let pageCount = 0
        const MAX_HTML_PAGES = 500
        const rawChaps: { title: string; chUrl: string }[] = []

        while (pageUrl && pageCount < MAX_HTML_PAGES) {
          const pageHtml = pageUrl === storyUrl ? html : await fetch$(pageUrl, 15000)
          const $ = cheerio.load(pageHtml)
          const origin2: string = new URL(pageUrl).origin

          const sel = cfg.chapterListSel || 'a[href*="chuong"], a[href*="chapter"], a[href*="chap"], a[href*="tap"]'
          $(sel).each((_, el) => {
            const $a = $(el).is('a') ? $(el) : $(el).find('a').first()
            if (!$a.length) return
            const href = $a.attr('href') ?? ''
            if (!href || href.startsWith('#') || href.startsWith('javascript')) return
            const text = $a.attr('title') || $a.text().trim()
            const chUrl = href.startsWith('http') ? href : href.startsWith('/') ? origin2 + href : new URL(href, pageUrl!).toString()
            if (rawChaps.find(c => c.chUrl === chUrl)) return // dedup
            rawChaps.push({ title: text || chUrl, chUrl })
          })

          // Next page
          const nextEl = cfg.nextPageSel
            ? $(cfg.nextPageSel).first()
            : $('a[rel="next"], .pagination .next a, li.next a, a:contains("›"):last, a:contains("»"):last').first()
          const nextHref = nextEl.attr('href')
          let nextPageUrl: string | undefined
          if (nextHref && !nextHref.includes('javascript') && nextHref !== '#') {
            const resolved: string = nextHref.startsWith('http') ? nextHref : origin2 + nextHref
            if (resolved !== pageUrl && resolved.startsWith(origin2)) nextPageUrl = resolved
          }

          if (!nextPageUrl) break
          pageUrl = nextPageUrl
          pageCount++
          await new Promise(r => setTimeout(r, 400))
        }

        if (rawChaps.length > 0) {
          return rawChaps.map((c, i) => ({ num: i + 1, title: c.title, url: c.chUrl }))
        }
      }

      // Pattern 3: Last resort — single-page scan using chapterListSel or broad selector
      {
        const $ = cheerio.load(html)
        const rawChaps: { title: string; chUrl: string }[] = []
        const sel3 = cfg.chapterListSel || 'a[href]'
        $(sel3).each((_, el) => {
          const $a = $(el).is('a') ? $(el) : $(el).find('a').first()
          if (!$a.length) return
          const href = $a.attr('href') ?? ''
          if (!href || href === '#' || href.startsWith('javascript') || href.startsWith('mailto')) return
          const text = $a.attr('title') || $a.text().trim()
          const chUrl = href.startsWith('http') ? href : href.startsWith('/') ? origin + href : ''
          if (!chUrl) return
          if (rawChaps.find(c => c.chUrl === chUrl)) return
          rawChaps.push({ title: text || chUrl, chUrl })
        })
        return rawChaps.map((c, i) => ({ num: i + 1, title: c.title, url: c.chUrl }))
      }
    },

    // ── Chapter content ─────────────────────────────────────────────────────────
    fetchChapterContent(_url, html) {
      const $ = cheerio.load(html)

      $('script, style, noscript, iframe').remove()
      $('[class*="ad"], [id*="ad"], [class*="banner"], [class*="related"], [class*="recommend"]').remove()
      $('nav, header, footer, .breadcrumb, [class*="menu"], [class*="sidebar"]').remove()
      $('[class*="comment"], [class*="rating"], [class*="share"], [class*="social"]').remove()

      if (cfg.chapterContentSel) {
        const cleanHtml = extractCleanHtml($, cfg.chapterContentSel)
        if (cleanHtml.length > 200) return cleanHtml
      }

      const contentSelectors = [
        '#chapter-content', '.chapter-content', '.content-chapter', '#content-chapter',
        '[id*="chapter-c"]', '.box-chapter', '#chapter-c',
        '.reading-content', '.chapter-body', '.novel-content',
        'article[class*="chapter"]', '.story-content', '#content',
      ]
      for (const sel of contentSelectors) {
        const cleanHtml = extractCleanHtml($, sel)
        if (cleanHtml.length > 200) return cleanHtml
      }

      let bestSel = ''
      let bestScore = 0
      $('div, section, article').each((_, el) => {
        const $el = $(el)
        const pCount = $el.find('p').length
        const textLen = $el.text().trim().length
        const score = pCount * 100 + textLen
        if (score > bestScore && pCount >= 3 && textLen > 500) {
          bestScore = score
          const id = $el.attr('id')
          const cls = $el.attr('class')?.split(' ')[0]
          bestSel = id ? `#${id}` : cls ? `.${cls}` : ''
        }
      })
      if (bestSel) {
        const cleanHtml = extractCleanHtml($, bestSel)
        if (cleanHtml.length > 200) return cleanHtml
      }

      const pHtmlParts: string[] = []
      $('p').each((_, el) => {
        const text = $(el).text().trim()
        if (text.length > 20 && !text.match(/^(Chương|Chapter|\d+|Trang|Về đầu|Tiếp|Trước|←|→)/)) {
          pHtmlParts.push(`<p>${text}</p>`)
        }
      })
      if (pHtmlParts.length > 3) return pHtmlParts.join('\n')

      const plainText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 80000)
      return plainText.split(/\n{2,}/).map(p => `<p>${p.trim()}</p>`).join('\n')
    }
  }
}

// ─── Generic Adapter ──────────────────────────────────────────────────────────
// Smart fallbacks for any unknown site when no DB SiteConfig is configured

const genericAdapter: SiteAdapter = {
  name: 'Generic (best-effort)',
  matches: () => true,

  fetchStoryInfo(url, html) {
    const $ = cheerio.load(html)
    let title = $('h1').first().text().trim()
      || $('meta[property="og:title"]').attr('content')?.split(' - ')[0].trim() || ''
    title = title.replace(/\s*[-|]\s*(Doc Truyen|Truyen Chu|Novel|TruyenFull|MeTruyenChu).*/i, '').trim()
    const bodyText = $('body').text().toLowerCase()
    const status: StoryInfo['status'] = bodyText.includes('hoan thanh') ? 'COMPLETED' : 'ONGOING'
    return {
      title,
      author: $('[itemprop="author"]').first().text().trim() || $('meta[name="author"]').attr('content')?.trim() || '',
      description: $('meta[property="og:description"]').attr('content')?.trim() || $('meta[name="description"]').attr('content')?.trim() || '',
      coverUrl: $('meta[property="og:image"]').attr('content') || '',
      genres: [],
      status,
      totalChapters: 0,
      sourceUrl: url,
    }
  },

  fetchChapterList(url, html) {
    const $ = cheerio.load(html)
    const origin = new URL(url).origin
    const chapters: ChapterRef[] = []
    $('a[href*="chuong"], a[href*="chapter"]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      const match = href.match(/chuong[_-](\d+)|chapter[_-](\d+)/i)
      if (match && href) {
        const num = parseInt(match[1] || match[2])
        const chUrl = href.startsWith('http') ? href : href.startsWith('/') ? origin + href : new URL(href, url).toString()
        if (!chapters.find(c => c.num === num)) chapters.push({ num, title: $(el).text().trim() || `Chuong ${num}`, url: chUrl })
      }
    })

    // Detect next page (common selectors — no config needed)
    let nextPageUrl: string | undefined
    const nextEl = $('a[rel="next"], .pagination .next a, .pagination a[aria-label*="ext"], li.next a, .pager-next a').first()
    const nextHref = nextEl.attr('href')
    if (nextHref && !nextHref.includes('javascript') && nextHref !== '#') {
      const resolved = nextHref.startsWith('http') ? nextHref : origin + nextHref
      if (resolved !== url && resolved.startsWith(origin)) nextPageUrl = resolved
    }

    return { chapters, nextPageUrl }
  },

  // Follow all paginated pages to get the full chapter list
  async fetchAllChapters(storyUrl: string, html: string): Promise<ChapterRef[]> {
    const origin = new URL(storyUrl).origin
    let pageUrl: string | undefined = storyUrl
    let pageCount = 0
    const MAX_PAGES = 100
    const allChapters: ChapterRef[] = []

    while (pageUrl && pageCount < MAX_PAGES) {
      const pageHtml = pageUrl === storyUrl ? html : await fetchUrl(pageUrl, 15000)
      const { chapters: pageChaps, nextPageUrl } = this.fetchChapterList(pageUrl, pageHtml)

      for (const ch of pageChaps) {
        if (!allChapters.find(c => c.num === ch.num || c.url === ch.url)) allChapters.push(ch)
      }

      console.log(`[Generic] page ${pageCount + 1}: ${pageChaps.length} chapters, nextPage: ${nextPageUrl ?? 'none'}`)
      if (!nextPageUrl || nextPageUrl === pageUrl || pageChaps.length === 0) break
      pageUrl = nextPageUrl
      pageCount++
      await new Promise(r => setTimeout(r, 400))
    }

    allChapters.sort((a, b) => a.num - b.num)
    return allChapters
  },

  fetchChapterContent(_url, html) {
    const $ = cheerio.load(html)
    $('script, style, nav, header, footer, .ads').remove()
    const cleanHtml = extractCleanHtml($, 'article, main, .content, .chapter, #content, #chapter-content')
    if (cleanHtml.length > 100) return cleanHtml
    const pParts: string[] = []
    $('p').each((_, el) => {
      const t = $(el).text().trim()
      if (t.length > 20) pParts.push('<p>' + t + '</p>')
    })
    return pParts.length > 3 ? pParts.join('\n') : '<p>' + $('body').text().replace(/\s+/g, ' ').trim().slice(0, 50000) + '</p>'
  }
}

export function getAdapter(_url: string): SiteAdapter {
  return genericAdapter
}

/**
 * Get adapter for a URL.
 * Priority: DB SiteConfig (custom adapter) → Generic adapter
 */
export async function getAdapterWithDbConfig(url: string): Promise<{ adapter: SiteAdapter; cookies: string | undefined }> {
  const domain = extractDomain(url)

  try {
    const { prisma } = await import('@/lib/prisma')
    const cfg = await prisma.siteConfig.findFirst({
      where: { domain, isActive: true },
    })
    if (cfg) {
      return {
        adapter: buildAdapterFromConfig(cfg as DbSiteConfig),
        cookies: (cfg as DbSiteConfig).cookies || undefined,
      }
    }
  } catch {
    // DB not available
  }

  return { adapter: genericAdapter, cookies: undefined }
}

// ─── Helper: download and save cover image to local storage ───────────────────

/**
 * Download and save cover image locally.
 * - Uses proxy if configured (same proxy as crawler)
 * - Uses storyUrl as Referer (some CDNs check Referer)
 * - Falls back to original external URL if download fails
 *   (so story page still shows an image via Next.js remote optimization)
 */
export async function downloadAndSaveCover(imageUrl: string, storyUrl?: string): Promise<string | null> {
  if (!imageUrl || !imageUrl.startsWith('http')) return null

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
    'Referer': storyUrl ?? new URL(imageUrl).origin + '/',
    'Cache-Control': 'no-cache',
  }

  try {
    // Try with proxy first if configured
    const settings = await getCrawlSettings()
    const proxyUrl = settings.proxyUrl

    let res: Response | undefined
    if (proxyUrl) {
      try {
        const { ProxyAgent, fetch: undiciFetch } = await import('undici')
        const agent = new ProxyAgent(proxyUrl)
        res = (await (undiciFetch as any)(imageUrl, {
          headers,
          signal: AbortSignal.timeout(20000),
          redirect: 'follow',
          dispatcher: agent,
        })) as Response
      } catch {
        // Proxy failed — try direct
      }
    }

    if (!res || !res.ok) {
      res = await fetch(imageUrl, {
        headers,
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      })
    }

    if (!res.ok) {
      console.warn(`[Cover] ⚠️ Failed to download ${imageUrl} — status ${res.status}. Storing external URL.`)
      return imageUrl
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return imageUrl
    }

    // Kiểm tra Content-Length trước khi download để tránh OOM với ảnh cực lớn
    const MAX_COVER_SIZE = 5 * 1024 * 1024 // 5MB
    const contentLength = parseInt(res.headers.get('content-length') ?? '0', 10)
    if (contentLength > MAX_COVER_SIZE) {
      console.warn(`[Cover] ⚠️ Cover too large (${contentLength} bytes > 5MB). Storing external URL.`)
      return imageUrl
    }

    let ext = 'jpg'
    if (contentType.includes('png')) ext = 'png'
    else if (contentType.includes('webp')) ext = 'webp'
    else if (contentType.includes('gif')) ext = 'gif'
    else {
      const urlExt = imageUrl.split('?')[0].split('.').pop()?.toLowerCase()
      if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(urlExt)) ext = urlExt
    }

    const { writeFile, mkdir } = await import('fs/promises')
    const { join } = await import('path')
    const { randomUUID } = await import('crypto')

    const bytes = await res.arrayBuffer()
    if (bytes.byteLength < 100) return imageUrl        // quá nhỏ — fallback
    if (bytes.byteLength > MAX_COVER_SIZE) return imageUrl  // vượt 5MB — fallback

    // Lưu vào uploads/covers/ — tách biệt với admin assets (uploads/assets/)
    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'covers')
    await mkdir(uploadDir, { recursive: true })

    await writeFile(join(uploadDir, filename), Buffer.from(bytes))
    console.log(`[Cover] ✅ Saved ${filename} (${bytes.byteLength} bytes)`)
    return `/uploads/covers/${filename}`

  } catch (e: any) {
    console.warn(`[Cover] ⚠️ Error downloading cover: ${e?.message}. Storing external URL.`)
    return imageUrl
  }
}
