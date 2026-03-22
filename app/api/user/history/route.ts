import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Update reading history when user reads a chapter
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storyId, chapterId, chapterNum } = await req.json()
  if (!storyId || !chapterNum) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await prisma.readingHistory.upsert({
    where: { userId_storyId: { userId: session.user.id, storyId } },
    update: { lastChapterId: chapterId ?? null, lastChapterNum: chapterNum },
    create: {
      userId: session.user.id,
      storyId,
      lastChapterId: chapterId ?? null,
      lastChapterNum: chapterNum,
    },
  })

  return NextResponse.json({ success: true })
}
