import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  requestRole: z.enum(['AUTHOR', 'TRANSLATOR']),
  reason: z.string().min(50, 'Lý do phải ít nhất 50 ký tự').max(2000),
  portfolio: z.string().url().optional().or(z.literal('')),
})

// GET /api/role-requests — xem request của mình
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requests = await prisma.roleRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(requests)
}

// POST /api/role-requests — gửi yêu cầu nâng cấp
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Không cho phép ADMIN tạo request
  if (session.user.role === 'ADMIN') {
    return NextResponse.json({ error: 'Admin không cần yêu cầu' }, { status: 400 })
  }

  // User đã có role AUTHOR hoặc TRANSLATOR rồi
  if (session.user.role === 'AUTHOR' || session.user.role === 'TRANSLATOR') {
    return NextResponse.json({ error: 'Bạn đã là tác giả/dịch giả' }, { status: 400 })
  }

  const parsedBody = schema.safeParse(await req.json())
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.errors[0].message }, { status: 400 })
  }

  // Kiểm tra có pending request chưa
  const existing = await prisma.roleRequest.findFirst({
    where: { userId: session.user.id, status: 'PENDING' },
  })
  if (existing) {
    return NextResponse.json({ error: 'Bạn đang có yêu cầu chờ duyệt' }, { status: 400 })
  }

  const request = await prisma.roleRequest.create({
    data: {
      userId: session.user.id,
      requestRole: parsedBody.data.requestRole,
      reason: parsedBody.data.reason,
      portfolio: parsedBody.data.portfolio || null,
    },
  })

  return NextResponse.json({ success: true, request }, { status: 201 })
}
