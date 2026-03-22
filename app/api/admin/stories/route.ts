import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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

async function isAdmin(req: NextRequest) {
  const session = await auth()
  return session?.user?.role === 'ADMIN'
}

// CREATE
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  return NextResponse.json({ success: true, story }, { status: 201 })
}

// LIST
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
      include: { _count: { select: { chapters: true } } },
    }),
    prisma.story.count({ where }),
  ])

  return NextResponse.json({ stories, total, page, totalPages: Math.ceil(total / PER_PAGE) })
}
