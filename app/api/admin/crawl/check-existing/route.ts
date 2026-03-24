import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/admin/crawl/check-existing
// Body: { urls: string[] }
// Returns: { existingUrls: string[] } — subset of input URLs that already have a crawlSchedule or story with that sourceUrl
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { urls } = await req.json() as { urls: string[] }
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ existingUrls: [] })
  }

  // Check CrawlSchedule.sourceUrl — most reliable (set when a story is crawled)
  const schedules = await prisma.crawlSchedule.findMany({
    where: { sourceUrl: { in: urls } },
    select: { sourceUrl: true },
  })
  const fromSchedule = new Set(schedules.map(s => s.sourceUrl))

  // Additionally check CrawlLog.sourceUrl for stories crawled without a schedule
  const logs = await prisma.crawlLog.findMany({
    where: { sourceUrl: { in: urls }, status: { in: ['success', 'no_new'] } },
    select: { sourceUrl: true },
    distinct: ['sourceUrl'],
  })
  const fromLogs = new Set(logs.map(l => l.sourceUrl))

  const existingUrls = urls.filter(u => fromSchedule.has(u) || fromLogs.has(u))
  return NextResponse.json({ existingUrls })
}
