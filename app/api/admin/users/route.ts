import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin() { const s = await auth(); return s?.user?.role === 'ADMIN' }

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const sp = req.nextUrl.searchParams
  const q = sp.get('q') ?? ''
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
  const PER_PAGE = 20
  const where = q ? {
    OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { email: { contains: q, mode: 'insensitive' as const } },
    ]
  } : {}
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, take: PER_PAGE, skip: (page - 1) * PER_PAGE,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, coinBalance: true, createdAt: true,
        _count: { select: { bookmarks: true, readingHistory: true, transactions: true } } },
    }),
    prisma.user.count({ where }),
  ])
  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / PER_PAGE) })
}
