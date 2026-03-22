import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  })

  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[Redis] Connection error:', err.message)
    }
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const val = await redis.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // silently fail — cache is not critical
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch {
    // silently fail
  }
}
