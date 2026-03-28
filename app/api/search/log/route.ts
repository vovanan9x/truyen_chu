import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/search/log  { keyword: string }
export async function POST(req: NextRequest) {
  try {
    const { keyword } = await req.json()
    const kw = keyword?.trim()?.toLowerCase()?.slice(0, 100)
    if (!kw || kw.length < 2) return NextResponse.json({ ok: false })

    await prisma.searchLog.upsert({
      where: { keyword: kw },
      update: { count: { increment: 1 } },
      create: { keyword: kw, count: 1 },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

// GET /api/search/log  → top 15 keywords
export async function GET() {
  try {
    const logs = await prisma.searchLog.findMany({
      orderBy: { count: 'desc' },
      take: 15,
      select: { keyword: true, count: true },
    })
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json([])
  }
}
