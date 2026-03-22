import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().min(1).optional(),
  isLocked: z.boolean().optional(),
  coinCost: z.number().int().min(0).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  action: z.enum(['save', 'submit']).optional(),
})

// PATCH /api/author/stories/[id]/chapters/[chapterId]
export async function PATCH(req: NextRequest, { params }: { params: { id: string; chapterId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const story = await prisma.story.findFirst({ where: { id: params.id, ownerId: session.user.id } })
  if (!story && session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const chapter = await prisma.chapter.findFirst({ where: { id: params.chapterId, storyId: params.id } })
  if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const d = parsed.data
  const isSubmit = d.action === 'submit'
  const wordCount = d.content ? d.content.split(/\s+/).length : chapter.wordCount

  const updated = await prisma.chapter.update({
    where: { id: params.chapterId },
    data: {
      ...(d.title !== undefined && { title: d.title }),
      ...(d.content !== undefined && { content: d.content, wordCount }),
      ...(d.isLocked !== undefined && { isLocked: d.isLocked }),
      ...(d.coinCost !== undefined && { coinCost: d.coinCost }),
      ...(d.sourceUrl !== undefined && { sourceUrl: d.sourceUrl || null }),
      ...(isSubmit ? { publishStatus: 'PENDING', submittedAt: new Date(), rejectReason: null } : {}),
      ...(!isSubmit && chapter.publishStatus === 'APPROVED' && d.content ? { publishStatus: 'DRAFT' } : {}),
    },
  })

  return NextResponse.json({ success: true, chapter: updated })
}

// DELETE /api/author/stories/[id]/chapters/[chapterId]
export async function DELETE(req: NextRequest, { params }: { params: { id: string; chapterId: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const story = await prisma.story.findFirst({ where: { id: params.id, ownerId: session.user.id } })
  if (!story && session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.chapter.delete({ where: { id: params.chapterId } })
  return NextResponse.json({ success: true })
}
