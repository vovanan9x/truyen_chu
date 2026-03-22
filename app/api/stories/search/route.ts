import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  // Cache search results 60s — giảm DB query khi nhiều user tìm cùng từ khoá
  const cacheKey = `search:${q.toLowerCase().trim().slice(0, 50)}`
  const cached = await cacheGet<any[]>(cacheKey)
  if (cached) return NextResponse.json({ results: cached })

  const stories = await prisma.story.findMany({
    where: { title: { contains: q, mode: 'insensitive' } },
    take: 6,
    select: {
      slug: true, title: true, coverUrl: true, author: true,
      status: true, _count: { select: { chapters: true } },
    },
    orderBy: { viewCount: 'desc' },
  })

  await cacheSet(cacheKey, stories, 60)
  return NextResponse.json({ results: stories })
}
