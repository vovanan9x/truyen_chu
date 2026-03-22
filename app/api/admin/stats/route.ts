import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin() { const s = await auth(); return s?.user?.role === 'ADMIN' }

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    storyCount, userCount, totalViewsAgg, commentCount,
    recentUsers, topStories, recentTransactions, lockedChapterUnlocks,
  ] = await Promise.all([
    prisma.story.count(),
    prisma.user.count(),
    prisma.story.aggregate({ _sum: { viewCount: true } }),
    prisma.comment.count(),
    // New users last 7 days (one per day)
    prisma.user.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 7,
    }),
    // Top 5 stories by view
    prisma.story.findMany({
      take: 5, orderBy: { viewCount: 'desc' },
      select: { id: true, title: true, slug: true, viewCount: true, _count: { select: { chapters: true } } },
    }),
    // Recent successful transactions
    prisma.transaction.findMany({
      where: { status: 'SUCCESS', type: 'DEPOSIT' },
      take: 5, orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    }),
    // Total coins earned from unlocks
    prisma.transaction.aggregate({
      where: { type: 'UNLOCK', status: 'SUCCESS' },
      _sum: { coinAmount: true },
    }),
  ])

  return NextResponse.json({
    overview: {
      stories: storyCount,
      users: userCount,
      totalViews: totalViewsAgg._sum.viewCount ?? 0,
      comments: commentCount,
      coinsFromUnlocks: Math.abs(lockedChapterUnlocks._sum.coinAmount ?? 0),
    },
    topStories,
    recentTransactions,
  })
}
