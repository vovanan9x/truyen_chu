import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis'

// Cache key helper
const unreadKey = (userId: string) => `notif:unread:${userId}`

// GET /api/notifications — lấy n thông báo + count unread
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get('offset') ?? '0'))
  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20')))
  const userId = session.user.id

  // Thử lấy unreadCount từ Redis cache — tránh 67 DB query/s khi 2000 user poll
  let unreadCount: number
  const cached = await cacheGet<number>(unreadKey(userId))

  if (cached !== null) {
    // Cache hit — chỉ query danh sách notifications (không cần COUNT)
    unreadCount = cached
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })
    return NextResponse.json({ notifications, unreadCount })
  }

  // Cache miss — query cả hai, cache unreadCount 60s
  const [notifications, count] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ])

  unreadCount = count
  await cacheSet(unreadKey(userId), unreadCount, 60)

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH /api/notifications — đánh dấu đã đọc
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const body = await req.json().catch(() => ({}))
  const id = body.id // nếu có id thì đọc 1 cái, không có thì đọc tất cả

  if (id) {
    await prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    })
  } else {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }

  // Invalidate cache để lần poll tiếp theo lấy count mới từ DB
  await cacheDel(unreadKey(userId))

  return NextResponse.json({ success: true })
}

