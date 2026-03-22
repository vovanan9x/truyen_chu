import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  chapterNum: z.number().int().positive(),
  title: z.string().max(300).optional(),
  content: z.string().min(1, 'Nội dung không được để trống'),
  isLocked: z.boolean().optional(),
  coinCost: z.number().int().min(0).max(9999).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  action: z.enum(['save', 'submit']).optional(), // save = DRAFT, submit = PENDING
})

// GET /api/author/stories/[id]/chapters
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const story = await prisma.story.findFirst({ where: { id: params.id, ownerId: session.user.id } })
  if (!story && session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const chapters = await prisma.chapter.findMany({
    where: { storyId: params.id },
    orderBy: { chapterNum: 'asc' },
    select: {
      id: true, chapterNum: true, title: true, wordCount: true,
      isLocked: true, coinCost: true, publishStatus: true,
      rejectReason: true, submittedAt: true, createdAt: true,
    },
  })

  return NextResponse.json({ chapters })
}

// POST /api/author/stories/[id]/chapters — thêm chương mới
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || !['AUTHOR', 'TRANSLATOR', 'ADMIN'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const story = await prisma.story.findFirst({ where: { id: params.id, ownerId: session.user.id } })
  if (!story && session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const d = parsed.data
  const isSubmit = d.action === 'submit'
  const wordCount = d.content.split(/\s+/).length

  const chapter = await prisma.chapter.create({
    data: {
      storyId: params.id,
      chapterNum: d.chapterNum,
      title: d.title,
      content: d.content,
      wordCount,
      isLocked: d.isLocked ?? false,
      coinCost: d.coinCost ?? 0,
      sourceUrl: d.sourceUrl || null,
      publishStatus: isSubmit ? 'PENDING' : 'DRAFT',
      submittedAt: isSubmit ? new Date() : null,
    },
  })

  return NextResponse.json({ success: true, chapter }, { status: 201 })
}
