import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  author: z.string().optional(),
  coverUrl: z.string().optional(),   // accept relative paths like /uploads/... or full URLs
  description: z.string().optional(),
  status: z.enum(['ONGOING', 'COMPLETED', 'HIATUS']),
  isFeatured: z.boolean(),
  sourceUrl: z.string().optional(),  // accept relative paths or full URLs
  sourceName: z.string().optional(),
})


async function isAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const story = await prisma.story.findUnique({
    where: { id: params.id },
    include: { genres: { include: { genre: true } } },
  })
  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(story)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const data = parsed.data

  // Check slug uniqueness (allow same story)
  const slugConflict = await prisma.story.findFirst({
    where: { slug: data.slug, NOT: { id: params.id } },
  })
  if (slugConflict) return NextResponse.json({ error: 'Slug đã tồn tại' }, { status: 409 })

  const story = await prisma.story.update({
    where: { id: params.id },
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

  return NextResponse.json({ success: true, story })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.story.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
