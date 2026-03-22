import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/crawl/schedules — list all schedules
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const schedules = await prisma.crawlSchedule.findMany({
    include: { story: { select: { id: true, title: true, slug: true, coverUrl: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ schedules })
}

// POST /api/admin/crawl/schedules — create schedule for a story
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { storyId, sourceUrl, intervalMinutes = 30 } = await req.json()
  if (!storyId || !sourceUrl) return NextResponse.json({ error: 'Missing storyId or sourceUrl' }, { status: 400 })

  const nextRunAt = new Date(Date.now() + intervalMinutes * 60 * 1000)

  const schedule = await prisma.crawlSchedule.upsert({
    where: { storyId },
    create: { storyId, sourceUrl, intervalMinutes, nextRunAt },
    update: { sourceUrl, intervalMinutes, isActive: true, nextRunAt },
    include: { story: { select: { title: true } } },
  })

  return NextResponse.json({ schedule })
}

// PATCH /api/admin/crawl/schedules — update schedule
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, intervalMinutes, isActive } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const schedule = await prisma.crawlSchedule.update({
    where: { id },
    data: {
      ...(intervalMinutes !== undefined && { intervalMinutes }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  return NextResponse.json({ schedule })
}

// DELETE /api/admin/crawl/schedules?id=...
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.crawlSchedule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
