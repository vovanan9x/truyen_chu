/**
 * Rate limiter — Redis-backed with in-memory fallback.
 * Fix #5: Redis ensures rate limit persists across server restarts/pm2 reloads,
 * preventing bots from bypassing by triggering a restart.
 */
import { redis } from '@/lib/redis'

interface Entry { count: number; resetAt: number }

// In-memory fallback (used if Redis is unavailable)
const memStore = new Map<string, Entry>()
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    memStore.forEach((v, k) => { if (v.resetAt < now) memStore.delete(k) })
  }, 5 * 60 * 1000)
}

function memRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const entry = memStore.get(key)
  if (!entry || entry.resetAt < now) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: new Date(now + windowMs) }
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.resetAt) }
  }
  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: new Date(entry.resetAt) }
}

/**
 * Async Redis-backed rate limiter.
 * Falls back to in-memory if Redis is unavailable.
 * @returns { allowed, remaining, resetAt }
 */
export async function rateLimitAsync(key: string, limit: number, windowMs: number) {
  const rKey = `rl:${key}`
  const windowSec = Math.ceil(windowMs / 1000)
  try {
    const pipeline = redis.pipeline()
    pipeline.incr(rKey)
    pipeline.ttl(rKey)
    const [[, count], [, ttl]] = await pipeline.exec() as any[]

    // Set expiry on first request
    if (Number(ttl) === -1) {
      await redis.expire(rKey, windowSec)
    }

    const remaining = Math.max(0, limit - Number(count))
    const allowed = Number(count) <= limit
    return { allowed, remaining, resetAt: new Date(Date.now() + (Number(ttl) > 0 ? Number(ttl) * 1000 : windowMs)) }
  } catch {
    // Redis unavailable — fall back to in-memory
    return memRateLimit(key, limit, windowMs)
  }
}

/**
 * Synchronous in-memory rate limiter (legacy, kept for backward compat).
 * Prefer rateLimitAsync for new code.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  return memRateLimit(key, limit, windowMs)
}
