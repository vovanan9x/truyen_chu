// GET /api/admin/crawl/logs — Lịch sử crawl từ DB (B)
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 30
  const storyId = searchParams.get('storyId') ?? undefined

  const [logs, total] = await Promise.all([
    prisma.crawlLog.findMany({
      where: storyId ? { storyId } : undefined,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.crawlLog.count({ where: storyId ? { storyId } : undefined }),
  ])

  return NextResponse.json({ logs, total, page, pageSize })
}

// DELETE /api/admin/crawl/logs?id=... — Xóa 1 log
export async function DELETE(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.crawlLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
