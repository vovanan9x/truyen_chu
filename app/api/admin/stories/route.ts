import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/permissions'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const schema = z.object({
  title: z.string().min(1, 'Tên truyện không được để trống'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu -'),
  author: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']).default('ONGOING'),
  isFeatured: z.boolean().default(false),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  sourceName: z.string().optional(),
})

// CREATE
export async function POST(req: NextRequest) {
  const { isAdminOrMod } = await getAdminSession()
  if (!isAdminOrMod) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const data = parsed.data

  const existing = await prisma.story.findUnique({ where: { slug: data.slug } })
  if (existing) {
    return NextResponse.json({ error: 'Slug đã tồn tại' }, { status: 409 })
  }

  const story = await prisma.story.create({
    data: {
      title: data.title,
      slug: data.slug,
      author: data.author || null,
      coverUrl: data.coverUrl || null,
      description: data.description || null,
      status: data.status,
      isFeatured: data.isFeatured,
      sourceUrl: data.sourceUrl || null,
      sourceName: data.sourceName || null,
    },
  })

  // Revalidate sitemap so new story appears immediately
  revalidatePath('/sitemap.xml')
  revalidatePath('/sitemap-index')

  return NextResponse.json({ success: true, story }, { status: 201 })
}

// LIST
export async function GET(req: NextRequest) {
  const { isAdminOrMod } = await getAdminSession()
  if (!isAdminOrMod) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const q = sp.get('q') ?? ''
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
  const PER_PAGE = 20

  const where = q ? { title: { contains: q, mode: 'insensitive' as const } } : {}

  const [stories, total] = await Promise.all([
    prisma.story.findMany({
      where,
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      orderBy: { updatedAt: 'desc' },
      include: {
        genres: { include: { genre: true } },
        _count: { select: { chapters: true } },
      },
    }),
    prisma.story.count({ where }),
  ])

  return NextResponse.json({ stories, total, page, totalPages: Math.ceil(total / PER_PAGE) })
}

// DELETE — Chỉ ADMIN, xóa cascade toàn bộ dữ liệu liên quan
export async function DELETE(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden — chỉ ADMIN mới được xóa truyện' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const story = await prisma.story.findUnique({
    where: { id },
    include: { _count: { select: { chapters: true } } },
  })
  if (!story) return NextResponse.json({ error: 'Không tìm thấy truyện' }, { status: 404 })

  // Cascade delete in transaction (FK-safe order).
  // Note: Comment, Rating, ReadingList, ChapterReport already have onDelete: Cascade
  // so they auto-delete when story/chapter is deleted.
  // We manually delete what Prisma won't cascade automatically.
  await prisma.$transaction([
    prisma.chapter.deleteMany({ where: { storyId: id } }),       // → also cascades ChapterReport
    prisma.storyGenre.deleteMany({ where: { storyId: id } }),
    prisma.bookmark.deleteMany({ where: { storyId: id } }),
    prisma.readingHistory.deleteMany({ where: { storyId: id } }),
    prisma.crawlSchedule.deleteMany({ where: { storyId: id } }),
    prisma.story.delete({ where: { id } }),                       // → cascades Comment, Rating, ReadingList
  ])

  revalidatePath('/admin/truyen')
  revalidatePath('/')
  revalidatePath('/truyen')

  return NextResponse.json({
    success: true,
    message: `Đã xóa "${story.title}" và ${story._count.chapters} chương`,
  })
}

