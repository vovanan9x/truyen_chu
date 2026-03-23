import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(
  req: NextRequest,
  { params }: { params: { storyId: string } }
) {
  const { storyId } = params
  const cookieKey = `v_${storyId}`
  const cookieStore = cookies()

  // Already viewed within the last hour? Skip.
  if (cookieStore.get(cookieKey)) {
    return NextResponse.json({ counted: false }, { status: 200 })
  }

  // Increment view count
  try {
    await prisma.story.update({
      where: { id: storyId },
      data: { viewCount: { increment: 1 } },
    })
  } catch {
    // Story not found or DB error — ignore
    return NextResponse.json({ counted: false }, { status: 200 })
  }

  // Set cookie for 1 hour so F5 spam doesn't re-count
  const res = NextResponse.json({ counted: true }, { status: 200 })
  res.cookies.set(cookieKey, '1', {
    httpOnly: true,
    maxAge: 3600, // 1 hour
    path: '/',
    sameSite: 'lax',
  })
  return res
}
