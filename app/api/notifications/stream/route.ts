/**
 * GET /api/notifications/stream — Server-Sent Events (SSE)
 *
 * Thay thế polling 30s: mỗi user giữ 1 long-lived connection.
 * Server push unreadCount khi có thay đổi (qua Redis pub/sub).
 *
 * Tính toán tải: 5000 CCU × 1 connection = 5000 long-poll connections
 * Node.js async I/O xử lý tốt hơn 5000 connections × 2 DB query/phút.
 */

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, redis } from '@/lib/redis'
import Redis from 'ioredis'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const KEEPALIVE_INTERVAL = 25_000  // 25s ping để giữ connection
const CHANNEL_PREFIX = 'notif:push:'

// Cache key helper (giống notification/route.ts)
const unreadKey = (userId: string) => `notif:unread:${userId}`

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id

  // Tạo SSE stream
  const encoder = new TextEncoder()
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null
  let subscriber: Redis | null = null
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      // Helper gửi event
      function send(event: string, data: unknown) {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        } catch { closed = true }
      }

      // 1. Gửi unreadCount ngay khi connect
      try {
        let unread = await cacheGet<number>(unreadKey(userId))
        if (unread === null) {
          unread = await prisma.notification.count({
            where: { userId, isRead: false },
          })
          await cacheSet(unreadKey(userId), unread, 60)
        }
        send('unread', { count: unread })
      } catch { /* Redis/DB offline — bỏ qua */ }

      // 2. Subscribe Redis pub/sub kênh của user này
      try {
        subscriber = redis.duplicate()
        const channel = `${CHANNEL_PREFIX}${userId}`

        await subscriber.subscribe(channel)
        subscriber.on('message', (_ch: string, msg: string) => {
          try {
            const data = JSON.parse(msg)
            send('unread', data)
          } catch {
            send('unread', { count: 0 })
          }
        })
      } catch {
        // Redis offline — hoạt động ở "silent" mode (chỉ gửi count 1 lần khi connect)
      }

      // 3. Keepalive ping mỗi 25s để tránh timeout proxy/CDN
      keepaliveTimer = setInterval(() => {
        if (closed) {
          if (keepaliveTimer) clearInterval(keepaliveTimer)
          return
        }
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          closed = true
          if (keepaliveTimer) clearInterval(keepaliveTimer)
        }
      }, KEEPALIVE_INTERVAL)

      // 4. Cleanup khi client disconnect
      req.signal.addEventListener('abort', () => {
        closed = true
        if (keepaliveTimer) clearInterval(keepaliveTimer)
        subscriber?.unsubscribe().catch(() => {})
        subscriber?.quit().catch(() => {})
        try { controller.close() } catch {}
      })
    },

    cancel() {
      closed = true
      if (keepaliveTimer) clearInterval(keepaliveTimer)
      subscriber?.unsubscribe().catch(() => {})
      subscriber?.quit().catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // Tắt Nginx buffering
    },
  })
}
