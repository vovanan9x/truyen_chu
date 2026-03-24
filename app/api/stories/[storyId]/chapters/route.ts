import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stories/[storyId]/chapters
// NOTE: despite the param name, [storyId] here receives the story SLUG
// (same dynamic segment as the [storyId]/view route).
// This endpoint accepts both slug and DB id for flexibility.
export async function GET(
  _req: NextRequest,
  { params }: { params: { storyId: string } }
) {
  const { storyId } = params

  // Try lookup by slug first, fall back to DB id
  const story = await prisma.story.findFirst({
    where: {
      OR: [{ slug: storyId }, { id: storyId }],
    },
    select: { id: true },
  })
  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const chapters = await prisma.chapter.findMany({
    where: { storyId: story.id },
    orderBy: { chapterNum: 'asc' },
    select: { id: true, chapterNum: true, title: true, isLocked: true, publishedAt: true },
  })

  return NextResponse.json(
    {
      chapters: chapters.map(ch => ({
        ...ch,
        publishedAt: ch.publishedAt?.toISOString() ?? null,
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  )
}
