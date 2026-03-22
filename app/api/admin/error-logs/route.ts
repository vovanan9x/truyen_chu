import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const level = req.nextUrl.searchParams.get('level') ?? 'all'
  const resolved = req.nextUrl.searchParams.get('resolved')
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'))
  const PER_PAGE = 50

  const where: any = {}
  if (level !== 'all') where.level = level.toUpperCase()
  if (resolved === 'true') where.resolved = true
  if (resolved === 'false') where.resolved = false

  const [logs, total, stats] = await Promise.all([
    prisma.errorLog.findMany({
      where, take: PER_PAGE, skip: (page - 1) * PER_PAGE,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.errorLog.count({ where }),
    prisma.errorLog.groupBy({
      by: ['level'],
      _count: { id: true },
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }),
  ])

  return NextResponse.json({ logs, total, stats })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids, resolved } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  await prisma.errorLog.updateMany({
    where: { id: { in: ids } },
    data: { resolved, resolvedAt: resolved ? new Date() : null }
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    // Xoá tất cả đã resolved
    const { count } = await prisma.errorLog.deleteMany({ where: { resolved: true } })
    return NextResponse.json({ deleted: count })
  }

  await prisma.errorLog.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ ok: true })
}
