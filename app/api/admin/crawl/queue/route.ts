import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/crawl/queue — list queue items
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user?.role ?? ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // pending|running|done|failed|all
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  const where = status && status !== 'all' ? { status } : {}

  const [items, total, counts] = await Promise.all([
    prisma.crawlQueue.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.crawlQueue.count({ where }),
    prisma.crawlQueue.groupBy({ by: ['status'], _count: { status: true } }),
  ])

  const stats = Object.fromEntries(counts.map(c => [c.status, c._count.status]))

  return NextResponse.json({ items, total, page, stats })
}

// POST /api/admin/crawl/queue — add URLs to queue
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user?.role ?? ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    urls,           // string[] — story URLs
    fromChapter = 1,
    toChapter = 9999,
    concurrency = 5,
    batchDelay = 300,
    overwrite = false,
    priority = 0,
  } = body as {
    urls: string[]
    fromChapter?: number
    toChapter?: number
    concurrency?: number
    batchDelay?: number
    overwrite?: boolean
    priority?: number
  }

  if (!Array.isArray(urls) || urls.length === 0)
    return NextResponse.json({ error: 'urls array is required' }, { status: 400 })

  // Deduplicate — skip URLs already in pending/running
  const existing = await prisma.crawlQueue.findMany({
    where: { url: { in: urls }, status: { in: ['pending', 'running'] } },
    select: { url: true },
  })
  const existingUrls = new Set(existing.map(e => e.url))
  const toAdd = urls.filter(u => !existingUrls.has(u))

  if (toAdd.length === 0)
    return NextResponse.json({ added: 0, skipped: urls.length, message: 'All URLs already queued' })

  await prisma.crawlQueue.createMany({
    data: toAdd.map(url => ({
      url, fromChapter, toChapter, concurrency, batchDelay, overwrite, priority,
    })),
  })

  return NextResponse.json({ added: toAdd.length, skipped: urls.length - toAdd.length })
}

// DELETE /api/admin/crawl/queue — clear done/failed (or specific id)
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const status = searchParams.get('status') // 'done','failed','all'

  if (id) {
    await prisma.crawlQueue.delete({ where: { id } })
    return NextResponse.json({ deleted: 1 })
  }

  const where = status === 'all'
    ? {}
    : { status: { in: ['done', 'failed'] } }

  const { count } = await prisma.crawlQueue.deleteMany({ where })
  return NextResponse.json({ deleted: count })
}
