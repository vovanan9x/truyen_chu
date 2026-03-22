import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SEO_DEFAULTS, invalidateSeoCache } from '@/lib/seo'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.setting.findMany({ where: { key: { startsWith: 'seo.' } } })
  const settings: Record<string, string> = { ...SEO_DEFAULTS }
  rows.forEach(r => { settings[r.key] = r.value })

  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { settings } = await req.json()
  if (!settings || typeof settings !== 'object') return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  // Chỉ cho phép lưu các key hợp lệ trong SEO_DEFAULTS
  const validKeys = Object.keys(SEO_DEFAULTS)
  const ops = Object.entries(settings as Record<string, string>)
    .filter(([k]) => validKeys.includes(k))
    .map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )

  await Promise.all(ops)
  invalidateSeoCache()

  return NextResponse.json({ ok: true, saved: ops.length })
}
