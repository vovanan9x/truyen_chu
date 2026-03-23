/**
 * Playwright bypass — dùng Chromium headless để lấy nội dung trang bị Cloudflare chặn.
 *
 * **Proxy Pool support:**
 * - Mỗi domain được gán 1 proxy cố định (stable hash) → giữ cf session theo IP
 * - Nhiều domain có thể chạy song song trên các proxy khác nhau
 * - BrowserContext được cache 23h per (domain × proxy)
 *
 * Không dùng cookie extraction — lấy thẳng HTML qua Playwright
 * để bypass cả IP block lẫn TLS fingerprint detection.
 */

import type { CrawlSettings } from './crawl-settings'

interface ContextEntry {
  context: any   // Playwright BrowserContext
  browser: any   // Playwright Browser
  proxyUrl: string | null
  expiresAt: number
}

// Key: domain
const contextCache = new Map<string, ContextEntry>()
const CONTEXT_TTL = 23 * 60 * 60 * 1000 // 23 giờ

// Round-robin counter cho fetch thường (không Playwright)
let _rrIndex = 0

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Chọn proxy ổn định cho domain (hash domain → index trong pool) */
function pickProxyForDomain(domain: string, proxies: string[]): string | null {
  if (!proxies.length) return null
  // Simple stable hash: sum of char codes % pool size
  let hash = 0
  for (let i = 0; i < domain.length; i++) hash = (hash * 31 + domain.charCodeAt(i)) & 0x7fffffff
  return proxies[hash % proxies.length]
}

/** Round-robin proxy cho fetch thông thường */
export function getNextProxyUrl(proxies: string[]): string | null {
  if (!proxies.length) return null
  const url = proxies[_rrIndex % proxies.length]
  _rrIndex++
  return url
}

/** Xoá cache context của một domain */
export async function invalidateBypassContext(url: string) {
  const domain = getDomain(url)
  const cached = contextCache.get(domain)
  if (cached) {
    try { await cached.browser.close() } catch { /* ignore */ }
    contextCache.delete(domain)
    console.log(`[Playwright] 🗑️ Invalidated context for ${domain}`)
  }
}

/** Kiểm tra domain có đang có context cached không */
export function hasActiveContext(url: string): boolean {
  const domain = getDomain(url)
  const cached = contextCache.get(domain)
  return !!cached && Date.now() < cached.expiresAt
}

/** Build proxy launchOptions cho Playwright */
function buildProxyOption(proxyUrl: string | null): any {
  if (!proxyUrl) return {}
  try {
    const u = new URL(proxyUrl)
    return {
      proxy: {
        server: `${u.protocol}//${u.hostname}:${u.port}`,
        ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
        ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
      }
    }
  } catch {
    return {}
  }
}

/** Lấy hoặc tạo BrowserContext cho domain (stable proxy from pool) */
async function getOrCreateContext(domain: string, settings: CrawlSettings) {
  const cached = contextCache.get(domain)
  if (cached && Date.now() < cached.expiresAt) {
    return { context: cached.context, browser: cached.browser, isNew: false }
  }

  if (cached) {
    try { await cached.browser.close() } catch { /* ignore */ }
    contextCache.delete(domain)
  }

  // Pick stable proxy for this domain
  const proxyUrl = pickProxyForDomain(domain, settings.proxies)
  if (proxyUrl) {
    const masked = proxyUrl.replace(/:([^:@]+)@/, ':***@')
    console.log(`[Playwright] 🔀 Domain "${domain}" → proxy: ${masked}`)
  }

  const { chromium } = await import('playwright')

  const launchOptions: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
    ...buildProxyOption(proxyUrl),
  }

  const browser = await chromium.launch(launchOptions)
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'vi-VN',
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
  })

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    ;(window as any).chrome = { runtime: {} }
  })

  contextCache.set(domain, { context, browser, proxyUrl, expiresAt: Date.now() + CONTEXT_TTL })
  return { context, browser, isNew: true }
}

/**
 * fetchUrlWithPlaywright — navigate to URL and return HTML.
 * Reuses BrowserContext (keeps Cloudflare session alive 23h).
 * Stable proxy assignment per domain from pool.
 */
export async function fetchUrlWithPlaywright(url: string, settings: CrawlSettings): Promise<string> {
  const domain = getDomain(url)
  console.log(`[Playwright] 🚀 Fetching ${url}`)

  const { context, isNew } = await getOrCreateContext(domain, settings)

  const page = await context.newPage()
  try {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
    } catch {
      // timeout is OK — page may have loaded enough
    }

    // If brand new context, wait for Cloudflare challenge to resolve
    if (isNew) {
      const title = await page.title().catch(() => '')
      if (title.includes('Just a moment') || title.includes('Checking') || title === '') {
        console.log(`[Playwright] ⏳ Waiting for Cloudflare challenge...`)
        await page.waitForTimeout(8000)
        try { await page.reload({ waitUntil: 'networkidle', timeout: 15000 }) } catch { /* ok */ }
      }
    }

    const finalTitle = await page.title().catch(() => '')
    if (finalTitle.includes('Just a moment') || finalTitle.includes('Checking')) {
      await page.waitForTimeout(5000)
    }

    const html = await page.content()
    const poolInfo = settings.proxies.length > 1
      ? ` [proxy pool: ${settings.proxies.length} proxies]`
      : settings.proxies.length === 1 ? ' [proxy]' : ' [no proxy]'
    console.log(`[Playwright] ✅ Got HTML for ${domain} (${html.length} chars)${poolInfo}`)
    return html

  } finally {
    await page.close().catch(() => { /* ignore */ })
  }
}

/** Proxy pool status — dùng cho admin diagnostics */
export function getProxyPoolStatus() {
  const now = Date.now()
  return Array.from(contextCache.entries()).map(([domain, entry]) => ({
    domain,
    proxyUrl: entry.proxyUrl?.replace(/:([^:@]+)@/, ':***@') ?? null,
    expiresIn: Math.round((entry.expiresAt - now) / 60000), // minutes
    alive: now < entry.expiresAt,
  }))
}
