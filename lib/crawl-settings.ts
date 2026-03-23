/**
 * Crawler settings — đọc proxy config và Playwright toggle từ DB.
 * Cache 60s để tránh query DB mỗi request.
 *
 * Proxy pool: lưu nhiều proxy dưới dạng danh sách (crawl_proxy_list),
 * mỗi dòng là 1 URL theo format: http://user:pass@host:port
 */

export interface CrawlSettings {
  proxyUrl: string | null    // proxy đầu tiên (hoặc từ env) — backward compat
  proxies: string[]          // toàn bộ proxy pool
  usePlaywright: boolean
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
        key: { in: ['crawl_proxy_list', 'crawl_proxy_host', 'crawl_proxy_port', 'crawl_proxy_user', 'crawl_proxy_pass', 'crawl_use_playwright'] }
      }
    })
    const m = Object.fromEntries(rows.map(r => [r.key, r.value]))

    // Parse proxy list (one URL per line)
    const proxyListRaw = m['crawl_proxy_list']?.trim() ?? ''
    let proxies: string[] = proxyListRaw
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http'))

    // Backward compat: single proxy fields
    if (proxies.length === 0) {
      const host = m['crawl_proxy_host']?.trim()
      const port = m['crawl_proxy_port']?.trim() || '10000'
      const user = m['crawl_proxy_user']?.trim()
      const pass = m['crawl_proxy_pass']?.trim()
      if (host) {
        const single = (user && pass)
          ? `http://${user}:${pass}@${host}:${port}`
          : `http://${host}:${port}`
        proxies = [single]
      }
    }

    // Fallback to CRAWL_PROXY_URL env
    if (proxies.length === 0 && process.env.CRAWL_PROXY_URL) {
      proxies = [process.env.CRAWL_PROXY_URL]
    }

    _cache = {
      proxyUrl: proxies[0] ?? null,
      proxies,
      usePlaywright: m['crawl_use_playwright'] === '1',
    }
    _cacheAt = Date.now()
  } catch {
    _cache = {
      proxyUrl: process.env.CRAWL_PROXY_URL ?? null,
      proxies: process.env.CRAWL_PROXY_URL ? [process.env.CRAWL_PROXY_URL] : [],
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
