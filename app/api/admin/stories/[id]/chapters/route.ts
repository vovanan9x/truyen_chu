import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function isAdmin() {
  const s = await auth(); return s?.user?.role === 'ADMIN'
}

const chapterSchema = z.object({
  chapterNum: z.number().int().min(1),
  title: z.string().optional(),
  content: z.string().min(1, 'Nội dung không được trống'),
  isLocked: z.boolean().default(false),
  coinCost: z.number().int().min(0).default(0),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const chapters = await prisma.chapter.findMany({
    where: { storyId: params.id },
    orderBy: { chapterNum: 'asc' },
    select: { id: true, chapterNum: true, title: true, isLocked: true, coinCost: true, wordCount: true, publishedAt: true },
  })
  return NextResponse.json(chapters)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const parsed = chapterSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const existing = await prisma.chapter.findUnique({
    where: { storyId_chapterNum: { storyId: params.id, chapterNum: parsed.data.chapterNum } }
  })
  if (existing) return NextResponse.json({ error: 'Số chương đã tồn tại' }, { status: 409 })

  const chapter = await prisma.chapter.create({
    data: {
      ...parsed.data,
      storyId: params.id,
      wordCount: parsed.data.content.length,
    }
  })
  // Update story updatedAt
  await prisma.story.update({ where: { id: params.id }, data: { updatedAt: new Date() } })
  return NextResponse.json({ success: true, chapter }, { status: 201 })
}
