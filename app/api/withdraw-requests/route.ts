import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  coins: z.number().int().min(1000, 'Tối thiểu 1000 xu'),
  method: z.enum(['bank', 'momo']),
  accountInfo: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().min(1, 'Số tài khoản không được để trống'),
    accountName: z.string().min(1, 'Tên tài khoản không được để trống'),
    phone: z.string().optional(),
  }),
})

// GET /api/withdraw-requests — lịch sử rút xu của user
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requests = await prisma.withdrawRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ requests })
}

// POST /api/withdraw-requests — gửi yêu cầu rút xu
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Chỉ AUTHOR, TRANSLATOR, ADMIN mới được rút
  if (!['AUTHOR', 'TRANSLATOR', 'ADMIN'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Chỉ tác giả/dịch giả mới có thể rút xu' }, { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  // Lấy withdraw_min_coins từ settings (default 1000)
  const minSetting = await prisma.setting.findUnique({ where: { key: 'withdraw_min_coins' } })
  const minCoins = minSetting ? parseInt(minSetting.value) : 1000

  const { coins, method, accountInfo } = parsed.data

  if (coins < minCoins) {
    return NextResponse.json({ error: `Tối thiểu ${minCoins} xu để rút` }, { status: 400 })
  }

  // Kiểm tra số dư
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { coinBalance: true } })
  if (!user || user.coinBalance < coins) {
    return NextResponse.json({ error: 'Số dư xu không đủ' }, { status: 400 })
  }

  // Có pending request chưa?
  const existing = await prisma.withdrawRequest.findFirst({
    where: { userId: session.user.id, status: { in: ['PENDING', 'PROCESSING'] } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Bạn đang có yêu cầu rút xu chưa hoàn tất' }, { status: 400 })
  }

  const fee = Math.ceil(coins * 0.05)
  const netCoins = coins - fee

  // Trừ xu ngay lập tức
  const request = await prisma.$transaction(async tx => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { coinBalance: { decrement: coins } },
    })
    await tx.transaction.create({
      data: {
        userId: session.user.id,
        type: 'DEPOSIT',
        amount: 0,
        coinAmount: -coins,
        status: 'SUCCESS',
        meta: { note: `Rút ${coins} xu (phí ${fee} xu, nhận ${netCoins} xu)` },
      },
    })
    return tx.withdrawRequest.create({
      data: {
        userId: session.user.id,
        coins,
        fee,
        netCoins,
        method,
        accountInfo: JSON.stringify(accountInfo),
        status: 'PENDING',
      },
    })
  })

  return NextResponse.json({ success: true, request }, { status: 201 })
}
