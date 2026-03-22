import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSchedulerRunning } from '@/lib/scheduler'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const [activeCount, totalCount] = await Promise.all([
    prisma.crawlSchedule.count({ where: { isActive: true } }),
    prisma.crawlSchedule.count(),
  ])

  return NextResponse.json({
    schedulerRunning: isSchedulerRunning(),
    activeSchedules: activeCount,
    totalSchedules: totalCount,
    checkIntervalMinutes: 1,
  })
}
