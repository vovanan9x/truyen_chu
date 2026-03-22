import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function isAdmin() { const s = await auth(); return s?.user?.role === 'ADMIN' }

const schema = z.object({
  name: z.string().min(1, 'Tên thể loại không được trống'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug chỉ dùng chữ thường, số và -'),
})

export async function GET() {
  const genres = await prisma.genre.findMany({
    include: { _count: { select: { stories: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(genres)
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const existing = await prisma.genre.findFirst({ where: { OR: [{ name: parsed.data.name }, { slug: parsed.data.slug }] } })
  if (existing) return NextResponse.json({ error: 'Tên hoặc slug đã tồn tại' }, { status: 409 })

  const genre = await prisma.genre.create({ data: parsed.data })
  return NextResponse.json({ success: true, genre }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const parsed = schema.extend({ id: z.string() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  const { id, ...data } = parsed.data
  const genre = await prisma.genre.update({ where: { id }, data })
  return NextResponse.json({ success: true, genre })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.genre.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
