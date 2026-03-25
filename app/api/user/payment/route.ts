import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Bảng giá cố định ở server — user không thể tự khai giá
const COIN_PACKAGES: Record<number, number> = {
  50:   15000,
  100:  25000,
  200:  45000,
  500:  100000,
  1000: 180000,
}

const schema = z.object({
  packageCoins: z.number().int().positive().refine(
    v => COIN_PACKAGES[v] !== undefined,
    { message: 'Gói xu không hợp lệ' }
  ),
  method: z.enum(['bank', 'momo', 'vnpay']),
  transactionId: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
})

// GET /api/user/payment — user's own requests
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requests = await prisma.paymentRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ requests })
}

// POST /api/user/payment — submit new request
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 })

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })

  const { packageCoins, method, transactionId, note } = result.data
  const packagePrice = COIN_PACKAGES[packageCoins] // giá server-side, không tin client

  // Check pending limit (max 3 pending at once)
  const pendingCount = await prisma.paymentRequest.count({
    where: { userId: session.user.id, status: 'PENDING' },
  })
  if (pendingCount >= 3) {
    return NextResponse.json({ error: 'Bạn đang có 3 yêu cầu chờ xử lý. Vui lòng chờ admin duyệt.' }, { status: 400 })
  }

  const payment = await prisma.paymentRequest.create({
    data: {
      userId: session.user.id,
      packageCoins,
      packagePrice, // ← giá từ server, không phải client
      method,
      transactionId: transactionId || null,
      note: note || null,
    },
  })

  return NextResponse.json({ success: true, requestId: payment.id })
}
