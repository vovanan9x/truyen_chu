import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const DAILY_LIMIT_COINS = 5000

const transferSchema = z.object({
  toDisplayId: z.number().int().positive(), // số ID ngắn của người nhận
  amount: z.number().int().positive().max(5000),
  message: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const body = await req.json()
  const parsed = transferSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { toDisplayId, amount, message } = parsed.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock sender row
      const [senderRow] = await tx.$queryRaw<{ id: string; coinBalance: number; displayId: number }[]>`
        SELECT id, "coinBalance", "displayId" FROM users WHERE id = ${session.user.id} FOR UPDATE
      `
      if (!senderRow) throw new Error('Không tìm thấy tài khoản')

      // 2. Không chuyển cho chính mình
      if (senderRow.displayId === toDisplayId) {
        throw new Error('Không thể chuyển xu cho chính mình')
      }

      // 3. Kiểm tra số dư
      if (senderRow.coinBalance < amount) throw new Error('Số xu không đủ')

      // 4. Kiểm tra giới hạn ngày
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
      const todaySent = await tx.coinTransfer.aggregate({
        where: { fromUserId: session.user.id, createdAt: { gte: startOfDay } },
        _sum: { amount: true },
      })
      const todayTotal = todaySent._sum.amount ?? 0
      if (todayTotal + amount > DAILY_LIMIT_COINS) {
        throw new Error(`Vượt giới hạn ${DAILY_LIMIT_COINS} xu/ngày. Đã chuyển: ${todayTotal} xu.`)
      }

      // 5. Tìm người nhận bằng displayId
      const receiver = await tx.user.findUnique({
        where: { displayId: toDisplayId },
        select: { id: true, name: true, displayId: true }
      })
      if (!receiver) throw new Error(`Không tìm thấy người dùng #${toDisplayId}`)

      // 6. Thực hiện transfer
      await tx.user.update({ where: { id: session.user.id }, data: { coinBalance: { decrement: amount } } })
      await tx.user.update({ where: { id: receiver.id }, data: { coinBalance: { increment: amount } } })
      const transfer = await tx.coinTransfer.create({
        data: { fromUserId: session.user.id, toUserId: receiver.id, amount, message: message?.trim() || null }
      })
      return { transfer, receiverName: receiver.name, receiverDisplayId: receiver.displayId, receiverId: receiver.id }
    })

    // Notification (fire-and-forget)
    prisma.notification.create({
      data: {
        userId: result.receiverId,
        type: 'COIN_RECEIVED',
        title: `💰 Nhận ${amount} xu`,
        message: `${session.user.name || 'Ai đó'} đã gửi cho bạn ${amount} xu${message ? `: "${message}"` : ''}`,
        link: `/nguoi-dung/vi`,
      }
    }).catch(() => {})

    return NextResponse.json({ success: true, transfer: result.transfer, receiverName: result.receiverName })
  } catch (err: any) {
    const msg = err?.message ?? 'Lỗi hệ thống'
    const isUserError = ['Số xu không đủ', 'Vượt giới hạn', 'Không tìm thấy', 'chính mình'].some(s => msg.includes(s))
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 })
  }
}

// GET — lịch sử chuyển/nhận xu
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') ?? 'all'
  const where = type === 'sent' ? { fromUserId: session.user.id }
    : type === 'received' ? { toUserId: session.user.id }
    : { OR: [{ fromUserId: session.user.id }, { toUserId: session.user.id }] }

  const transfers = await prisma.coinTransfer.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 50,
    include: {
      fromUser: { select: { id: true, name: true, avatar: true, displayId: true } },
      toUser: { select: { id: true, name: true, avatar: true, displayId: true } },
    },
  })
  return NextResponse.json({ transfers })
}
