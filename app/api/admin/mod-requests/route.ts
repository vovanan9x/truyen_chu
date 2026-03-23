import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/permissions'

// GET — ADMIN xem danh sách requests
// POST — MOD tạo request mới
export async function GET(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') ?? 'PENDING'
  const requests = await prisma.modRequest.findMany({
    where: status === 'all' ? {} : { status: status as any },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      mod: { select: { id: true, name: true, email: true, avatar: true } },
    },
  })
  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const { isMod, userId } = await getAdminSession()
  if (!isMod) return NextResponse.json({ error: 'Forbidden — chỉ MOD đăng request' }, { status: 403 })

  const { type, targetId, targetName, payload, reason } = await req.json()
  if (!type || !targetId) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 })

  const request = await prisma.modRequest.create({
    data: { modId: userId!, type, targetId, targetName, payload, reason },
  })
  return NextResponse.json({ success: true, request })
}
