import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/payment-requests
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get('status')
  const requests = await prisma.paymentRequest.findMany({
    where: status ? { status: status as any } : undefined,
    include: { user: { select: { id: true, name: true, email: true, coinBalance: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ requests })
}

// PUT /api/admin/payment-requests — approve or reject
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id, action, adminNote } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const request = await prisma.paymentRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status !== 'PENDING') {
    return NextResponse.json({ error: 'Yêu cầu này đã được xử lý' }, { status: 400 })
  }

  if (action === 'approve') {
    await prisma.$transaction([
      prisma.paymentRequest.update({
        where: { id },
        data: { status: 'APPROVED', adminNote: adminNote || null },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: { coinBalance: { increment: request.packageCoins } },
      }),
      prisma.transaction.create({
        data: {
          userId: request.userId,
          type: 'DEPOSIT',
          amount: request.packagePrice,
          coinAmount: request.packageCoins,
          status: 'SUCCESS',
          meta: { note: `Nạp ${request.packageCoins} xu qua ${request.method} — #${id.slice(-8)}`, adminNote },
        },
      }),
    ])
    return NextResponse.json({ success: true, action: 'approved' })
  }

  if (action === 'reject') {
    await prisma.paymentRequest.update({
      where: { id },
      data: { status: 'REJECTED', adminNote: adminNote || 'Không xác nhận được giao dịch' },
    })
    return NextResponse.json({ success: true, action: 'rejected' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
