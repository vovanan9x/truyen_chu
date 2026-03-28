/**
 * Shared crawl utilities reused by both the single-story crawl (start/route.ts)
 * and the batch crawl scheduler (lib/scheduler.ts).
 */

import { fetchUrl } from './crawl-adapters'

// ─── Proxy Health Tracker ──────────────────────────────────────────────────
const _proxyHealth = new Map<string, number>() // proxyUrl → coolingUntil (ms)
let _jobCounter = 0

export function markProxyCooling(proxyUrl: string, coolMs = 15 * 60 * 1000) {
  _proxyHealth.set(proxyUrl, Date.now() + coolMs)
  console.log(`[Proxy] 🔴 Cooling: ${redactProxy(proxyUrl)} for ${coolMs / 60000}min`)
}

export function getHealthyProxy(proxies: string[]): string | undefined {
  if (!proxies.length) return undefined
  const now = Date.now()
  const healthy = proxies.filter(p => (_proxyHealth.get(p) ?? 0) < now)
  if (healthy.length > 0) return healthy[_jobCounter++ % healthy.length]
  // All cooling → pick soonest
  return proxies.reduce((a, b) =>
    (_proxyHealth.get(a) ?? 0) < (_proxyHealth.get(b) ?? 0) ? a : b
  )
}

export function redactProxy(url: string) {
  return url.replace(/:([^:@]+)@/, ':***@')
}

// ─── Fetch with retry + smart proxy switching on 503 ──────────────────────
export async function fetchWithRetry(
  url: string,
  timeout = 15000,
  maxRetries = 3,
  cookies?: string,
  stickyProxyUrl?: string,
  onRetry?: (msg: string) => void,
  proxyPool: string[] = []
): Promise<{ html: string; attempts: number }> {
  let lastError: Error = new Error('Unknown error')
  let currentProxy = stickyProxyUrl
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const html = await fetchUrl(url, timeout, cookies, currentProxy)
      return { html, attempts: attempt }
    } catch (e: any) {
      lastError = e
      const msg: string = e?.message ?? ''
      if (msg.includes('404')) throw e
      if (attempt < maxRetries) {
        const is503 = msg.includes('503') || msg.includes('Service Unavailable')
        const is429 = msg.includes('429') || msg.includes('Too Many')
        if (is503 && currentProxy && proxyPool.length > 1) {
          markProxyCooling(currentProxy)
          const newProxy = getHealthyProxy(proxyPool.filter(p => p !== currentProxy)) ?? getHealthyProxy(proxyPool)
          const switched = newProxy !== currentProxy
          currentProxy = newProxy
          onRetry?.(`🔀 HTTP 503 (CF block) — ${switched ? 'chuyển sang proxy mới' : 'mọi proxy cooling, dùng proxy ít block nhất'} | retry (lần ${attempt}/${maxRetries - 1})`)
          await sleep(3000)
        } else {
          const baseDelay = is503 ? 45000 : is429 ? 5000 : 2000
          const delay = baseDelay * attempt
          const reason = is503 ? 'HTTP 503 (CF block)' : is429 ? 'HTTP 429' : msg.slice(0, 40)
          onRetry?.(`⏳ ${reason} — chờ ${Math.round(delay / 1000)}s rồi retry (lần ${attempt}/${maxRetries - 1})`)
          await sleep(delay)
        }
      }
    }
  }
  throw lastError
}

// ─── Process items in parallel batches ────────────────────────────────────
export async function processInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<void>,
  delayBetweenBatches = 400,
  cancelCheck?: () => boolean
) {
  for (let i = 0; i < items.length; i += batchSize) {
    if (cancelCheck?.()) break
    const batch = items.slice(i, i + batchSize)
    await Promise.allSettled(batch.map((item, j) => fn(item, i + j)))
    if (i + batchSize < items.length) await sleep(delayBetweenBatches)
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }
