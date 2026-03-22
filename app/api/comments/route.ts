import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { filterContent } from '@/lib/banned-words'
import { rateLimit } from '@/lib/rate-limit'
import { addXP, XP_REWARDS } from '@/lib/xp'

const schema = z.object({
  storyId: z.string().min(1),
  content: z.string().min(1, 'Không được để trống').max(2000, 'Tối đa 2000 ký tự'),
  parentId: z.string().optional(),
})

// GET /api/comments?storyId=...&cursor=...
export async function GET(req: NextRequest) {
  const storyId = req.nextUrl.searchParams.get('storyId')
  const cursor = req.nextUrl.searchParams.get('cursor')
  const userId = (await auth())?.user?.id

  if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 })

  const PAGE_SIZE = 15

  const comments = await prisma.comment.findMany({
    where: { storyId, parentId: null },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    include: {
      user: { select: { id: true, name: true, avatar: true, level: true } },
      replies: {
        take: 3,
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, avatar: true, level: true } } },
      },
      _count: { select: { replies: true } },
      likes: userId ? { where: { userId }, select: { userId: true } } : false,
    },
  })

  const hasMore = comments.length > PAGE_SIZE
  if (hasMore) comments.pop()

  return NextResponse.json({
    comments: comments.map(c => ({
      ...c,
      likedByMe: userId ? c.likes.length > 0 : false,
      likes: undefined,
    })),
    nextCursor: hasMore ? comments[comments.length - 1]?.id ?? null : null,
  })
}

// POST /api/comments — create comment or reply
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  // Rate limit: 5 comments per minute — in-memory, không cần DB query
  const rl = rateLimit(`comment:${session.user.id}`, 5, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Bạ nhắn quá nhiều. Chờ chút rồi thử lại.' }, { status: 429 })
  }

  // Lọc từ cấm
  const { filtered: filteredContent } = await filterContent(parsed.data.content.trim())

  const comment = await prisma.comment.create({
    data: {
      userId: session.user.id,
      storyId: parsed.data.storyId,
      content: filteredContent,
      parentId: parsed.data.parentId ?? null,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
      _count: { select: { replies: true } },
    },
  })

  // Cộng XP (fire-and-forget)
  addXP(session.user.id, XP_REWARDS.COMMENT).catch(() => {})

  // Nếu là reply → gửi thông báo cho chủ comment cha
  if (parsed.data.parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parsed.data.parentId },
      include: {
        story: { select: { title: true, slug: true } },
        user: { select: { id: true } },
      },
    })

    // Không notify chính mình
    if (parentComment && parentComment.user.id !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: parentComment.user.id,
          type: 'COMMENT_REPLY',
          title: `💬 ${session.user.name ?? 'Ai đó'} đã trả lời bình luận của bạn`,
          message: `"${comment.content.slice(0, 80)}${comment.content.length > 80 ? '...' : ''}"`,
          link: `/truyen/${parentComment.story.slug}#comment-${parentComment.id}`,
        },
      })
    }
  }

  return NextResponse.json({ success: true, comment: { ...comment, replies: [], likedByMe: false } }, { status: 201 })
}
