import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  chapterId: z.string().min(1),
  reason: z.enum(['WRONG_CHAPTER', 'MISSING_CONTENT', 'DUPLICATE', 'WRONG_STORY', 'OTHER']),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const report = await prisma.chapterReport.create({
    data: { userId: session.user.id, ...parsed.data },
  })
  return NextResponse.json({ success: true, report }, { status: 201 })
}
