import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/author/stories/[id] — chi tiết 1 truyện
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const story = await prisma.story.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: {
      genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { chapters: true, comments: true, bookmarks: true } },
    },
  })

  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(story)
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']).optional(),
  commissionRate: z.number().int().min(0).max(100).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  sourceAuthor: z.string().max(100).optional(),
  sourceLanguage: z.string().max(50).optional(),
  genreIds: z.array(z.string()).optional(),
})

// PATCH /api/author/stories/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || !['AUTHOR', 'TRANSLATOR', 'ADMIN'].includes(session.user.role!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const story = await prisma.story.findFirst({ where: { id: params.id, ownerId: session.user.id } })
  if (!story && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const parsed = updateSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const d = parsed.data
  const updated = await prisma.story.update({
    where: { id: params.id },
    data: {
      ...(d.title && { title: d.title }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.coverUrl !== undefined && { coverUrl: d.coverUrl || null }),
      ...(d.status && { status: d.status }),
      ...(d.commissionRate !== undefined && { commissionRate: d.commissionRate }),
      ...(d.sourceUrl !== undefined && { sourceUrl: d.sourceUrl || null }),
      ...(d.sourceAuthor !== undefined && { sourceAuthor: d.sourceAuthor }),
      ...(d.sourceLanguage !== undefined && { sourceLanguage: d.sourceLanguage }),
      ...(d.genreIds ? {
        genres: {
          deleteMany: {},
          create: d.genreIds.map(gId => ({ genreId: gId })),
        },
      } : {}),
    },
  })

  return NextResponse.json({ success: true, story: updated })
}

// DELETE /api/author/stories/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const story = await prisma.story.findFirst({ where: { id: params.id, ownerId: session.user.id } })
  if (!story && session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.story.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
