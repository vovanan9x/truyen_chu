import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lightweight chapter list — only returns fields needed for the chapter list accordion
// Typical size: 200 chapters × ~80 bytes = ~16KB — safe to load client-side
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const story = await prisma.story.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  })
  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const chapters = await prisma.chapter.findMany({
    where: { storyId: story.id },
    orderBy: { chapterNum: 'asc' },
    select: { id: true, chapterNum: true, title: true, isLocked: true, publishedAt: true },
  })

  return NextResponse.json(
    { chapters: chapters.map(ch => ({ ...ch, publishedAt: ch.publishedAt?.toISOString() ?? null })) },
    {
      headers: {
        // Cache 60s on CDN — new chapters will be reflected within 1 min
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  )
}
