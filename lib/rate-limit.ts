/**
 * In-memory rate limiter — không cần Redis cho scale vừa
 * Lưu số requests theo key (userId hoặc IP) trong window thời gian
 * Tự dọn dẹp entries cũ mỗi 5 phút
 */

interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Cleanup cũ entries mỗi 5 phút để tránh memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((v, k) => { if (v.resetAt < now) store.delete(k) })
  }, 5 * 60 * 1000)
}

/**
 * @returns { allowed: boolean, remaining: number, resetAt: Date }
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: new Date(now + windowMs) }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.resetAt) }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: new Date(entry.resetAt) }
}
