import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/comments/[id]/like  — toggle like
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const commentId = params.id
  const userId = session.user.id

  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  })

  if (existing) {
    // Unlike
    await prisma.$transaction([
      prisma.commentLike.delete({ where: { userId_commentId: { userId, commentId } } }),
      prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
    ])
    return NextResponse.json({ liked: false })
  } else {
    // Like
    await prisma.$transaction([
      prisma.commentLike.create({ data: { userId, commentId } }),
      prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ])
    return NextResponse.json({ liked: true })
  }
}

// GET /api/comments/[id]/replies — load more replies
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cursor = req.nextUrl.searchParams.get('cursor')
  const replies = await prisma.comment.findMany({
    where: { parentId: params.id },
    take: 10,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, avatar: true, level: true } }, _count: { select: { replies: true } } },
  })
  return NextResponse.json({ replies })
}
