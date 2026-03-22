import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storyId } = await req.json()
  if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 })

  const existing = await prisma.bookmark.findUnique({
    where: { userId_storyId: { userId: session.user.id, storyId } },
  })

  if (existing) {
    await prisma.bookmark.delete({
      where: { userId_storyId: { userId: session.user.id, storyId } },
    })
    return NextResponse.json({ bookmarked: false })
  } else {
    await prisma.bookmark.create({ data: { userId: session.user.id, storyId } })
    return NextResponse.json({ bookmarked: true })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ bookmarked: false })

  const storyId = req.nextUrl.searchParams.get('storyId')
  if (!storyId) return NextResponse.json({ bookmarked: false })

  const bookmark = await prisma.bookmark.findUnique({
    where: { userId_storyId: { userId: session.user.id, storyId } },
  })

  return NextResponse.json({ bookmarked: !!bookmark })
}
