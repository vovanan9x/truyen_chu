/**
 * Crawler settings — đọc proxy config và Playwright toggle từ DB.
 * Cache 60s để tránh query DB mỗi request.
 */

export interface CrawlSettings {
  proxyUrl: string | null      // format: http://user:pass@host:port
  usePlaywright: boolean        // bật/tắt Playwright bypass khi gặp 403
}

let _cache: CrawlSettings | null = null
let _cacheAt = 0
const CACHE_TTL = 60_000 // 60s

export async function getCrawlSettings(): Promise<CrawlSettings> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache

  try {
    const { prisma } = await import('@/lib/prisma')
    const rows = await prisma.setting.findMany({
      where: {
        key: { in: ['crawl_proxy_host', 'crawl_proxy_port', 'crawl_proxy_user', 'crawl_proxy_pass', 'crawl_use_playwright'] }
      }
    })
    const m = Object.fromEntries(rows.map(r => [r.key, r.value]))

    const host = m['crawl_proxy_host']?.trim()
    const port = m['crawl_proxy_port']?.trim() || '10000'
    const user = m['crawl_proxy_user']?.trim()
    const pass = m['crawl_proxy_pass']?.trim()

    let proxyUrl: string | null = null
    if (host) {
      proxyUrl = (user && pass)
        ? `http://${user}:${pass}@${host}:${port}`
        : `http://${host}:${port}`
    }

    // Fallback to env variable if DB proxy not set
    if (!proxyUrl && process.env.CRAWL_PROXY_URL) {
      proxyUrl = process.env.CRAWL_PROXY_URL
    }

    _cache = {
      proxyUrl,
      usePlaywright: m['crawl_use_playwright'] === '1',
    }
    _cacheAt = Date.now()
  } catch {
    // DB unavailable — use env fallback only
    _cache = {
      proxyUrl: process.env.CRAWL_PROXY_URL ?? null,
      usePlaywright: false,
    }
    _cacheAt = Date.now()
  }

  return _cache!
}

/** Force invalidate cache (gọi sau khi lưu settings) */
export function invalidateCrawlSettingsCache() {
  _cache = null
  _cacheAt = 0
}
