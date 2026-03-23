/**
 * Playwright bypass — dùng Chromium headless để lấy nội dung trang bị Cloudflare chặn.
 *
 * Thay vì chỉ lấy cookie rồi dùng fetch() (bị block do TLS fingerprint),
 * ta dùng Playwright để lấy LUÔN HTML — Cloudflare thấy Chrome thật, không block được.
 *
 * Cache: giữ browser context (cookies) theo domain 23 tiếng để tái sử dụng.
 */

import type { CrawlSettings } from './crawl-settings'

interface ContextCache {
  context: any   // Playwright BrowserContext
  browser: any   // Playwright Browser
  expiresAt: number
}

const contextCache = new Map<string, ContextCache>()
const CONTEXT_TTL = 23 * 60 * 60 * 1000 // 23 giờ

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Xoá cache context của một domain */
export async function invalidateBypassContext(url: string) {
  const domain = getDomain(url)
  const cached = contextCache.get(domain)
  if (cached) {
    try { await cached.browser.close() } catch { /* ignore */ }
    contextCache.delete(domain)
  }
}

/** Lấy hoặc tạo BrowserContext cho domain (reuse để giữ session Cloudflare) */
async function getOrCreateContext(domain: string, settings: CrawlSettings) {
  const cached = contextCache.get(domain)
  if (cached && Date.now() < cached.expiresAt) {
    return { context: cached.context, browser: cached.browser, isNew: false }
  }

  // Close old browser if exists
  if (cached) {
    try { await cached.browser.close() } catch { /* ignore */ }
    contextCache.delete(domain)
  }

  const { chromium } = await import('playwright')

  const launchOptions: any = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
    ],
  }

  if (settings.proxyUrl) {
    try {
      const u = new URL(settings.proxyUrl)
      launchOptions.proxy = {
        server: `${u.protocol}//${u.hostname}:${u.port}`,
        ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
        ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
      }
      console.log(`[Playwright] 🔀 Proxy: ${u.hostname}:${u.port}`)
    } catch { /* invalid proxy url */ }
  }

  const browser = await chromium.launch(launchOptions)
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'vi-VN',
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
    },
  })

  // Ẩn webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    ;(window as any).chrome = { runtime: {} }
  })

  contextCache.set(domain, { context, browser, expiresAt: Date.now() + CONTEXT_TTL })
  return { context, browser, isNew: true }
}

/**
 * fetchUrlWithPlaywright — dùng Playwright để lấy HTML trang.
 * Tái sử dụng browser context (giữ session Cloudflare 23h).
 */
export async function fetchUrlWithPlaywright(url: string, settings: CrawlSettings): Promise<string> {
  const domain = getDomain(url)
  console.log(`[Playwright] 🚀 Fetching ${url}`)

  let { context, browser, isNew } = await getOrCreateContext(domain, settings)

  const page = await context.newPage()
  try {
    // Navigate to URL
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 })
    } catch {
      // timeout OK — page might have loaded enough
    }

    // Nếu context mới, đợi Cloudflare challenge
    if (isNew) {
      const title = await page.title().catch(() => '')
      if (title.includes('Just a moment') || title.includes('Checking') || title === '') {
        console.log(`[Playwright] ⏳ Waiting for Cloudflare challenge...`)
        await page.waitForTimeout(8000)
        // Try navigating again
        try { await page.reload({ waitUntil: 'networkidle', timeout: 15000 }) } catch { /* ok */ }
      }
    }

    // Kiểm tra có bị block không
    const status = page.url()
    const finalTitle = await page.title().catch(() => '')
    if (finalTitle.includes('Just a moment') || finalTitle.includes('Checking')) {
      console.log(`[Playwright] ⚠️ Still on challenge page: ${finalTitle}`)
      await page.waitForTimeout(5000)
    }

    const html = await page.content()
    console.log(`[Playwright] ✅ Got HTML for ${domain} (${html.length} chars)`)
    return html

  } finally {
    await page.close().catch(() => { /* ignore */ })
  }
}

/** Dùng Playwright context đã có để fetch thêm URL cùng domain (dùng cookies session) */
export async function fetchAnotherPageWithPlaywright(url: string, domain: string): Promise<string> {
  const cached = contextCache.get(domain)
  if (!cached || Date.now() >= cached.expiresAt) {
    throw new Error(`No active Playwright context for ${domain}`)
  }

  const page = await cached.context.newPage()
  try {
    try { await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 }) } catch { /* ok */ }
    return await page.content()
  } finally {
    await page.close().catch(() => { /* ignore */ })
  }
}

/** Kiểm tra domain có đang có context cached không */
export function hasActiveContext(url: string): boolean {
  const domain = getDomain(url)
  const cached = contextCache.get(domain)
  return !!cached && Date.now() < cached.expiresAt
}
