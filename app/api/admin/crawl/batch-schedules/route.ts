import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/crawl/batch-schedules
export async function GET() {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const schedules = await prisma.batchCrawlSchedule.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ schedules })
}

// POST /api/admin/crawl/batch-schedules — create
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { name, categoryUrl, intervalMinutes, maxPages, maxStories, fromChapter, skipExisting, updateExisting, concurrency, chapterDelay, storyDelay, overwrite } = await req.json()
  if (!name || !categoryUrl) return NextResponse.json({ error: 'name và categoryUrl là bắt buộc' }, { status: 400 })

  const nextRunAt = new Date()
  const s = await prisma.batchCrawlSchedule.create({
    data: {
      name, categoryUrl,
      intervalMinutes: intervalMinutes ?? 1440,
      maxPages: maxPages ?? 3,
      maxStories: maxStories ?? 50,
      fromChapter: fromChapter ?? 1,
      skipExisting: skipExisting !== false,
      updateExisting: updateExisting === true,
      concurrency: concurrency ?? 3,
      chapterDelay: chapterDelay ?? 500,
      storyDelay: storyDelay ?? 2000,
      overwrite: overwrite === true,
      nextRunAt,
    },
  })
  return NextResponse.json({ schedule: s })
}

// PATCH /api/admin/crawl/batch-schedules — update
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, ...rest } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const data: any = {}
  const allowed = ['name','categoryUrl','intervalMinutes','maxPages','maxStories','fromChapter','skipExisting','updateExisting','overwrite','concurrency','chapterDelay','storyDelay','isActive']
  for (const key of allowed) {
    if (rest[key] !== undefined) data[key] = rest[key]
  }

  const s = await prisma.batchCrawlSchedule.update({ where: { id }, data })
  return NextResponse.json({ schedule: s })
}

// DELETE /api/admin/crawl/batch-schedules?id=...
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.batchCrawlSchedule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
