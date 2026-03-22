import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ items: [] })
  const status = req.nextUrl.searchParams.get('status') ?? undefined

  const items = await prisma.readingList.findMany({
    where: { userId: session.user.id, ...(status && { status: status as any }) },
    orderBy: { updatedAt: 'desc' },
    include: {
      story: {
        select: { id: true, title: true, slug: true, coverUrl: true, author: true,
          status: true, _count: { select: { chapters: true } } }
      }
    },
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { storyId, status } = await req.json()
  if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 })

  if (status === null) {
    // Remove from list
    await prisma.readingList.deleteMany({ where: { userId: session.user.id, storyId } })
    return NextResponse.json({ success: true, status: null })
  }

  const item = await prisma.readingList.upsert({
    where: { userId_storyId: { userId: session.user.id, storyId } },
    update: { status },
    create: { userId: session.user.id, storyId, status },
  })
  return NextResponse.json({ success: true, status: item.status })
}
