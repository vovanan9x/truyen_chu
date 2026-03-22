import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

async function isAdmin() {
  const s = await auth(); return s?.user?.role === 'ADMIN'
}

const schema = z.object({
  title: z.string().optional(),
  content: z.string().min(1).optional(),
  isLocked: z.boolean().optional(),
  coinCost: z.number().int().min(0).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const data = parsed.data
  const chapter = await prisma.chapter.update({
    where: { id: params.id },
    data: {
      ...data,
      ...(data.content && { wordCount: data.content.length }),
    },
  })
  return NextResponse.json({ success: true, chapter })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.chapter.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
