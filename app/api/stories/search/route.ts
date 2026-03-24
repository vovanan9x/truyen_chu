import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet } from '@/lib/redis'

// Normalize Vietnamese text → slug-like string for accent-insensitive matching
// "Bàn Tay Vàng" → "ban-tay-vang" (same as the slug field)
function normalizeQuery(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/đ/g, 'd')               // đ → d
    .replace(/[^a-z0-9\s]/g, '')      // remove special chars
    .trim()
    .replace(/\s+/g, '-')             // spaces → hyphens (matches slug format)
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  const qNorm = normalizeQuery(q)

  // Cache key = chuẩn hoá để "Bàn Tay Vàng" và "ban tay vang" dùng chung cache
  const cacheKey = `search:${qNorm.slice(0, 50)}`
  const cached = await cacheGet<any[]>(cacheKey)
  if (cached) return NextResponse.json({ results: cached })

  const stories = await prisma.story.findMany({
    where: {
      OR: [
        // Tìm theo tiêu đề gốc (có dấu) — case-insensitive
        { title: { contains: q, mode: 'insensitive' } },
        // Tìm theo tiêu đề không dấu qua slug — "ban tay vang" → "ban-tay-vang"
        { slug: { contains: qNorm, mode: 'insensitive' } },
        // Tìm theo tên tác giả
        { author: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 8,
    select: {
      slug: true, title: true, coverUrl: true, author: true,
      status: true, _count: { select: { chapters: true } },
    },
    orderBy: { viewCount: 'desc' },
  })

  await cacheSet(cacheKey, stories, 60)
  return NextResponse.json({ results: stories })
}
