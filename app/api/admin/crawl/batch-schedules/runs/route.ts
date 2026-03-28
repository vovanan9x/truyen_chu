import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/crawl/batch-schedules/runs?id=<scheduleId>&limit=10
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  const limit = Math.min(20, parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const runs = await prisma.batchCrawlRun.findMany({
    where: { scheduleId: id },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      startedAt: true,
      finishedAt: true,
      imported: true,
      updated: true,
      skipped: true,
      errors: true,
      retried: true,
      status: true,
    },
  })

  return NextResponse.json({ runs })
}
