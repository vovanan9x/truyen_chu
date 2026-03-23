/**
 * Playwright bypass — tự động giải Cloudflare JS challenge và lấy cf_clearance cookie.
 *
 * Flow:
 * 1. Launch Chromium headless (qua proxy nếu configured)
 * 2. Navigate đến URL, chờ Cloudflare challenge tự giải (networkidle hoặc 15s)
 * 3. Extract cookies (cf_clearance, __cf_bm, ...)
 * 4. Close browser
 * 5. Cache cookie per-domain 23 tiếng
 * 6. Return cookie string cho fetchUrl
 */

import type { CrawlSettings } from './crawl-settings'

interface CookieCache {
  cookie: string
  expiresAt: number
}

const cookieCache = new Map<string, CookieCache>()
const COOKIE_TTL = 23 * 60 * 60 * 1000 // 23 giờ

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export function getCachedBypassCookie(url: string): string | null {
  const domain = getDomain(url)
  const cached = cookieCache.get(domain)
  if (cached && Date.now() < cached.expiresAt) return cached.cookie
  cookieCache.delete(domain)
  return null
}

export async function getBypassCookie(url: string, settings: CrawlSettings): Promise<string | null> {
  const domain = getDomain(url)

  // Check cache first
  const cached = getCachedBypassCookie(url)
  if (cached) {
    console.log(`[Playwright] ♻️ Using cached cookie for ${domain}`)
    return cached
  }

  console.log(`[Playwright] 🚀 Launching Chromium for ${domain}...`)

  let browser: any = null
  try {
    // Dynamic import — chỉ load khi cần
    const { chromium } = await import('playwright')

    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    }

    // Dùng proxy trong Playwright nếu có
    if (settings.proxyUrl) {
      try {
        const u = new URL(settings.proxyUrl)
        launchOptions.proxy = {
          server: `${u.protocol}//${u.hostname}:${u.port}`,
          ...(u.username ? { username: u.username } : {}),
          ...(u.password ? { password: u.password } : {}),
        }
        console.log(`[Playwright] 🔀 Using proxy: ${u.hostname}:${u.port}`)
      } catch { /* invalid proxy url */ }
    }

    browser = await chromium.launch(launchOptions)
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'vi-VN',
      viewport: { width: 1280, height: 800 },
    })

    const page = await context.newPage()

    // Ẩn WebDriver flag (bypass Cloudflare bot detection)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    } catch {
      // networkidle timeout OK — Cloudflare có thể đang challenge
      await page.waitForTimeout(5000)
    }

    // Đợi thêm nếu trang vẫn đang challenge
    const title = await page.title()
    if (title.includes('Just a moment') || title.includes('Checking')) {
      console.log(`[Playwright] ⏳ Waiting for Cloudflare challenge...`)
      await page.waitForTimeout(8000)
    }

    // Lấy cookies
    const cookies = await context.cookies()
    const cfCookies = cookies.filter((c: { name: string; value: string; domain: string }) =>
      ['cf_clearance', '__cf_bm', '__cflb', 'CFID', 'CFTOKEN'].includes(c.name)
    )

    if (cfCookies.length === 0) {
      console.log(`[Playwright] ⚠️ No Cloudflare cookies found for ${domain}`)
      // Vẫn lấy tất cả cookie của domain này
      const allCookies = cookies.filter((c: { domain: string; name: string; value: string }) => c.domain.includes(domain.split('.').slice(-2).join('.')))
      if (allCookies.length > 0) {
        const cookieStr = allCookies.map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join('; ')
        cookieCache.set(domain, { cookie: cookieStr, expiresAt: Date.now() + COOKIE_TTL })
        console.log(`[Playwright] ✅ Got ${allCookies.length} cookies for ${domain}`)
        return cookieStr
      }
      return null
    }

    const cookieStr = cfCookies.map((c: { name: string; value: string }) => `${c.name}=${c.value}`).join('; ')
    cookieCache.set(domain, { cookie: cookieStr, expiresAt: Date.now() + COOKIE_TTL })
    console.log(`[Playwright] ✅ Got cf_clearance for ${domain} (cached 23h)`)
    return cookieStr

  } catch (e: any) {
    console.error(`[Playwright] ❌ Error for ${domain}:`, e?.message)
    return null
  } finally {
    if (browser) {
      try { await browser.close() } catch { /* ignore */ }
    }
  }
}

/** Xoá cache cookie của một domain (dùng khi cookie hết hạn) */
export function invalidateBypassCookie(url: string) {
  cookieCache.delete(getDomain(url))
}
