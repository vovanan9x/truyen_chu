import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/role-requests?status=PENDING
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'PENDING'

  const requests = await prisma.roleRequest.findMany({
    where: status === 'ALL' ? {} : { status: status as any },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true, role: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ requests })
}

// PUT /api/admin/role-requests — approve hoặc reject
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, action, adminNote } = await req.json()
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const roleReq = await prisma.roleRequest.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!roleReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'approve') {
    await prisma.$transaction([
      prisma.roleRequest.update({
        where: { id },
        data: { status: 'APPROVED', adminNote },
      }),
      prisma.user.update({
        where: { id: roleReq.userId },
        data: { role: roleReq.requestRole },
      }),
      prisma.notification.create({
        data: {
          userId: roleReq.userId,
          type: 'ROLE_APPROVED',
          title: '🎉 Yêu cầu của bạn đã được duyệt!',
          message: `Chúc mừng! Bạn đã trở thành ${roleReq.requestRole === 'AUTHOR' ? 'Tác giả' : 'Dịch giả'}. Hãy truy cập dashboard để bắt đầu đăng truyện.`,
          link: roleReq.requestRole === 'AUTHOR' ? '/tac-gia' : '/dich-gia',
        },
      }),
    ])
  } else {
    await prisma.$transaction([
      prisma.roleRequest.update({
        where: { id },
        data: { status: 'REJECTED', adminNote },
      }),
      prisma.notification.create({
        data: {
          userId: roleReq.userId,
          type: 'ROLE_REJECTED',
          title: '❌ Yêu cầu nâng cấp bị từ chối',
          message: adminNote || 'Yêu cầu của bạn không được chấp nhận lúc này. Bạn có thể gửi lại sau.',
          link: '/yeu-cau-nang-cap',
        },
      }),
    ])
  }

  return NextResponse.json({ success: true })
}
