import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/withdraw-requests?status=PENDING
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'PENDING'
  const requests = await prisma.withdrawRequest.findMany({
    where: status === 'ALL' ? {} : { status: status as any },
    include: { user: { select: { id: true, name: true, email: true, coinBalance: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ requests })
}

// PUT /api/admin/withdraw-requests — approve/processing/reject
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, action, adminNote } = await req.json()
  if (!id || !['processing', 'complete', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const req2 = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!req2) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'processing') {
    if (req2.status !== 'PENDING') return NextResponse.json({ error: 'Chỉ có thể chuyển sang Đang xử lý khi ở trạng thái Chờ' }, { status: 400 })
    await prisma.withdrawRequest.update({ where: { id }, data: { status: 'PROCESSING', adminNote } })
  } else if (action === 'complete') {
    if (req2.status !== 'PROCESSING') return NextResponse.json({ error: 'Chỉ có thể hoàn tất khi đang ở trạng thái Xử lý' }, { status: 400 })
    await prisma.$transaction([
      prisma.withdrawRequest.update({ where: { id }, data: { status: 'COMPLETED', adminNote } }),
      prisma.notification.create({
        data: {
          userId: req2.userId,
          type: 'WITHDRAW_COMPLETED',
          title: '✅ Yêu cầu rút xu đã hoàn tất',
          message: `Yêu cầu rút ${req2.coins} xu đã được xử lý. Bạn sẽ nhận được ${req2.netCoins} xu quy đổi thành tiền.`,
          link: '/rut-xu',
        },
      }),
    ])
  } else if (action === 'reject') {
    if (['COMPLETED', 'REJECTED'].includes(req2.status)) return NextResponse.json({ error: 'Không thể từ chối yêu cầu đã hoàn tất hoặc đã từ chối' }, { status: 400 })
    // Hoàn xu lại cho user
    await prisma.$transaction([
      prisma.withdrawRequest.update({ where: { id }, data: { status: 'REJECTED', adminNote } }),
      prisma.user.update({ where: { id: req2.userId }, data: { coinBalance: { increment: req2.coins } } }),
      prisma.transaction.create({
        data: {
          userId: req2.userId,
          type: 'DEPOSIT',
          amount: 0,
          coinAmount: req2.coins,
          status: 'SUCCESS',
          meta: { note: `Hoàn xu do yêu cầu rút #${id.slice(-8)} bị từ chối. ${adminNote ?? ''}` },
        },
      }),
      prisma.notification.create({
        data: {
          userId: req2.userId,
          type: 'WITHDRAW_REJECTED',
          title: '❌ Yêu cầu rút xu bị từ chối',
          message: `Yêu cầu rút ${req2.coins} xu bị từ chối. ${adminNote ?? ''} Xu đã được hoàn lại vào tài khoản.`,
          link: '/rut-xu',
        },
      }),
    ])
  }

  return NextResponse.json({ success: true })
}
