import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  storyId: z.string().min(1),
  score: z.number().int().min(1).max(5),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  const storyId = req.nextUrl.searchParams.get('storyId')
  if (!storyId) return NextResponse.json({ userRating: null })
  if (!session) return NextResponse.json({ userRating: null })

  const rating = await prisma.rating.findUnique({
    where: { userId_storyId: { userId: session.user.id, storyId } },
  })
  return NextResponse.json({ userRating: rating?.score ?? null })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { storyId, score } = parsed.data

  // Upsert rating
  await prisma.rating.upsert({
    where: { userId_storyId: { userId: session.user.id, storyId } },
    update: { score },
    create: { userId: session.user.id, storyId, score },
  })

  // Recalculate story rating average
  const agg = await prisma.rating.aggregate({
    where: { storyId },
    _avg: { score: true },
    _count: { score: true },
  })

  await prisma.story.update({
    where: { id: storyId },
    data: {
      rating: Math.round((agg._avg.score ?? 0) * 10) / 10,
      ratingCount: agg._count.score,
    },
  })

  return NextResponse.json({ success: true, score })
}
