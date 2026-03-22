import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const storySchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']).optional(),
  commissionRate: z.number().int().min(0).max(100).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  sourceAuthor: z.string().max(100).optional(),
  sourceLanguage: z.string().max(50).optional(),
  genreIds: z.array(z.string()).optional(),
})

function makeSlug(title: string) {
  return title.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').trim()
    + '-' + Date.now().toString(36)
}

// GET /api/author/stories
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !['AUTHOR', 'TRANSLATOR', 'ADMIN'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stories = await prisma.story.findMany({
    where: { ownerId: session.user.id },
    include: {
      _count: { select: { chapters: true, comments: true, bookmarks: true } },
      genres: { include: { genre: { select: { id: true, name: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Lấy pending/rejected chapter counts cho tất cả stories trong 1 query
  const storyIds = stories.map(s => s.id)
  const chapterCounts = await prisma.chapter.groupBy({
    by: ['storyId', 'publishStatus'],
    where: {
      storyId: { in: storyIds },
      publishStatus: { in: ['PENDING', 'REJECTED'] },
    },
    _count: true,
  })

  // Map thành { storyId → { PENDING: n, REJECTED: n } }
  const countMap: Record<string, { pending: number; rejected: number }> = {}
  for (const row of chapterCounts) {
    if (!countMap[row.storyId]) countMap[row.storyId] = { pending: 0, rejected: 0 }
    if (row.publishStatus === 'PENDING')  countMap[row.storyId].pending  = row._count
    if (row.publishStatus === 'REJECTED') countMap[row.storyId].rejected = row._count
  }

  const enriched = stories.map(s => ({
    ...s,
    pendingChapters:  countMap[s.id]?.pending  ?? 0,
    rejectedChapters: countMap[s.id]?.rejected ?? 0,
  }))

  return NextResponse.json({ stories: enriched })
}

// POST /api/author/stories
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['AUTHOR', 'TRANSLATOR'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Chỉ tác giả/dịch giả mới có thể đăng truyện' }, { status: 403 })
  }

  const parsed = storySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const d = parsed.data
  const slug = d.slug || makeSlug(d.title)

  const story = await prisma.story.create({
    data: {
      title: d.title,
      slug,
      description: d.description,
      coverUrl: d.coverUrl || null,
      status: d.status ?? 'ONGOING',
      commissionRate: d.commissionRate ?? 70,
      ownerId: session.user.id,
      ownerType: session.user.role,
      sourceUrl: d.sourceUrl || null,
      sourceAuthor: d.sourceAuthor,
      sourceLanguage: d.sourceLanguage,
      genres: d.genreIds?.length
        ? { create: d.genreIds.map(gId => ({ genreId: gId })) }
        : undefined,
    },
  })

  return NextResponse.json({ success: true, story }, { status: 201 })
}
