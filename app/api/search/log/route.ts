import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimitAsync } from '@/lib/rate-limit'
import { unstable_noStore as noStore } from 'next/cache'

// POST /api/search/log  { keyword: string }
// Fix #2 + #5: Redis-backed rate limit — 10 req/minute per IP, persists across restarts
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = await rateLimitAsync(`search-log:${ip}`, 10, 60_000)
    if (!rl.allowed) {
      return NextResponse.json({ ok: false }, { status: 429 })
    }

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
// Fix #6: Add noStore() so this does not get cached and expose stale data
export async function GET() {
  noStore()
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
