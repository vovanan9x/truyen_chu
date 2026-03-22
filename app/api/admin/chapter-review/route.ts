import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/chapter-review?status=PENDING&cursor=...
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'PENDING'
  const cursor = req.nextUrl.searchParams.get('cursor')
  const PAGE = 20

  const chapters = await prisma.chapter.findMany({
    where: status === 'ALL' ? {} : { publishStatus: status as any },
    take: PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { submittedAt: 'asc' },
    include: {
      story: {
        select: {
          id: true, title: true, slug: true, coverUrl: true,
          owner: { select: { id: true, name: true, email: true } },
          ownerType: true,
        },
      },
    },
  })

  const hasMore = chapters.length > PAGE
  if (hasMore) chapters.pop()

  return NextResponse.json({
    chapters,
    nextCursor: hasMore ? chapters[chapters.length - 1]?.id : null,
  })
}

// PUT /api/admin/chapter-review — approve hoặc reject
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, action, rejectReason } = await req.json()
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: { story: { select: { title: true, slug: true, ownerId: true, ownerType: true } } },
  })
  if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const chapterName = chapter.title || `Chương ${chapter.chapterNum}`
  const ownerId = chapter.story.ownerId

  if (action === 'approve') {
    await prisma.$transaction([
      prisma.chapter.update({
        where: { id },
        data: { publishStatus: 'APPROVED', rejectReason: null },
      }),
      ...( ownerId ? [prisma.notification.create({
        data: {
          userId: ownerId,
          type: 'CHAPTER_APPROVED',
          title: '✅ Chương đã được duyệt',
          message: `"${chapterName}" của truyện "${chapter.story.title}" đã được duyệt và hiển thị cho độc giả.`,
          link: `/truyen/${chapter.story.slug}/chuong/${chapter.chapterNum}`,
        },
      })] : []),
    ])
  } else {
    if (!rejectReason) {
      return NextResponse.json({ error: 'Cần nhập lý do từ chối' }, { status: 400 })
    }
    await prisma.$transaction([
      prisma.chapter.update({
        where: { id },
        data: { publishStatus: 'REJECTED', rejectReason },
      }),
      ...( ownerId ? [prisma.notification.create({
        data: {
          userId: ownerId,
          type: 'CHAPTER_REJECTED',
          title: '❌ Chương bị từ chối',
          message: `"${chapterName}" của truyện "${chapter.story.title}" bị từ chối. Lý do: ${rejectReason}`,
          link: chapter.story.ownerId ? `/tac-gia/truyen/${chapter.storyId}/chuong` : '#',
        },
      })] : []),
    ])
  }

  return NextResponse.json({ success: true })
}
