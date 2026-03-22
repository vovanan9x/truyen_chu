import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin() { const s = await auth(); return s?.user?.role === 'ADMIN' }

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
  const type = sp.get('type') ?? ''
  const status = sp.get('status') ?? ''
  const PER_PAGE = 30
  const where: any = {
    ...(type && { type }),
    ...(status && { status }),
  }
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where, take: PER_PAGE, skip: (page - 1) * PER_PAGE,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.transaction.count({ where }),
  ])
  return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / PER_PAGE) })
}

// Approve manual deposit (PENDING -> SUCCESS + credit coins)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, coinAmount, note } = await req.json()
  if (!userId || !coinAmount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: { userId, type: 'DEPOSIT', amount: coinAmount, coinAmount, status: 'SUCCESS', provider: 'manual', providerRef: note ?? 'admin' },
    }),
    prisma.user.update({ where: { id: userId }, data: { coinBalance: { increment: coinAmount } } }),
  ])
  return NextResponse.json({ success: true, transaction: tx }, { status: 201 })
}
