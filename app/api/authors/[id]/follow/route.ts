import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/authors/[id]/follow — toggle follow/unfollow
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const followerId = session.user.id
  const authorId = params.id

  if (followerId === authorId) return NextResponse.json({ error: 'Không thể tự follow mình' }, { status: 400 })

  // Check if already following
  const existing = await prisma.authorFollow.findUnique({
    where: { followerId_authorId: { followerId, authorId } },
  })

  if (existing) {
    // Unfollow
    await prisma.$transaction([
      prisma.authorFollow.delete({ where: { id: existing.id } }),
      prisma.user.update({ where: { id: authorId }, data: { followerCount: { decrement: 1 } } }),
    ])
    return NextResponse.json({ following: false })
  } else {
    // Follow
    await prisma.$transaction([
      prisma.authorFollow.create({ data: { followerId, authorId } }),
      prisma.user.update({ where: { id: authorId }, data: { followerCount: { increment: 1 } } }),
    ])

    // Tạo notification cho tác giả (fire-and-forget)
    prisma.notification.create({
      data: {
        userId: authorId,
        type: 'NEW_FOLLOWER',
        title: 'Người dùng mới theo dõi bạn',
        message: `${session.user.name || 'Một người dùng'} đã bắt đầu theo dõi bạn`,
        link: `/nguoi-dung/${followerId}`,
      }
    }).catch(() => {})

    return NextResponse.json({ following: true })
  }
}

// GET /api/authors/[id]/follow — kiểm tra trạng thái follow + số followers
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  const authorId = params.id

  const [author, following] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { followerCount: true, name: true, role: true } }),
    session
      ? prisma.authorFollow.findUnique({
          where: { followerId_authorId: { followerId: session.user.id, authorId } }
        })
      : null,
  ])

  if (!author) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    followerCount: author.followerCount,
    following: !!following,
  })
}
