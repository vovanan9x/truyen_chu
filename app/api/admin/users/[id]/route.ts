import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_ROLES = ['USER', 'AUTHOR', 'TRANSLATOR', 'MOD', 'ADMIN'] as const

async function getAdminSession() {
  const s = await auth()
  return s?.user?.role === 'ADMIN' ? s : null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      transactions: { take: 20, orderBy: { createdAt: 'desc' } },
      readingHistory: {
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: { story: { select: { title: true, slug: true } } },
      },
      bookmarks: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { story: { select: { title: true, slug: true } } },
      },
      _count: { select: { bookmarks: true, readingHistory: true, comments: true } },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { passwordHash, ...safe } = user
  return NextResponse.json(safe)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { role, coinDelta, note, name, email, bio, avatar, isBanned, banReason, banDays } = body

  const ops: any[] = []
  const userUpdate: Record<string, any> = {}

  if (name !== undefined) userUpdate.name = name
  if (email !== undefined) userUpdate.email = email
  if (bio !== undefined) userUpdate.bio = bio || null
  if (avatar !== undefined) userUpdate.avatar = avatar || null

  // Role validation — must be valid enum value
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Role không hợp lệ. Chỉ chấp nhận: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }
    userUpdate.role = role
  }

  // Ban / unban
  if (isBanned === true) {
    // Prevent self-ban
    if (params.id === session.user.id) {
      return NextResponse.json({ error: 'Không thể tự ban chính mình' }, { status: 400 })
    }
    const banExpiry = banDays ? new Date(Date.now() + banDays * 86400000) : null
    userUpdate.isBanned = true
    userUpdate.bannedAt = new Date()
    userUpdate.banReason = banReason || null
    userUpdate.banExpiry = banExpiry
  } else if (isBanned === false) {
    // Unban
    userUpdate.isBanned = false
    userUpdate.bannedAt = null
    userUpdate.banReason = null
    userUpdate.banExpiry = null
  }

  if (coinDelta) {
    userUpdate.coinBalance = { increment: coinDelta }
    ops.push(prisma.transaction.create({
      data: {
        userId: params.id,
        type: coinDelta > 0 ? 'DEPOSIT' : 'WITHDRAWAL',  // WITHDRAWAL, not UNLOCK
        amount: Math.abs(coinDelta),
        coinAmount: coinDelta,
        status: 'SUCCESS',
        provider: 'admin',
        providerRef: note ?? 'admin-adjustment',
      }
    }))
  }

  if (Object.keys(userUpdate).length > 0) {
    ops.unshift(prisma.user.update({ where: { id: params.id }, data: userUpdate }))
  }

  if (ops.length === 0) return NextResponse.json({ error: 'Không có gì để cập nhật' }, { status: 400 })
  await prisma.$transaction(ops)

  const updated = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, coinBalance: true, bio: true, avatar: true, isBanned: true, banReason: true, banExpiry: true }
  })
  return NextResponse.json({ success: true, user: updated })
}

// DELETE — ban user (kept for backward compat, but PATCH isBanned is preferred)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent self-ban
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'Không thể tự ban chính mình' }, { status: 400 })
  }

  const { banReason, banDays } = await req.json().catch(() => ({}))
  const banExpiry = banDays ? new Date(Date.now() + banDays * 86400000) : null
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { isBanned: true, bannedAt: new Date(), banReason: banReason || null, banExpiry },
    select: { id: true, name: true, isBanned: true, banReason: true, banExpiry: true }
  })
  return NextResponse.json({ user })
}
