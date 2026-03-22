import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invalidateBannedWordsCache } from '@/lib/banned-words'

// GET — list all banned words
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const words = await prisma.bannedWord.findMany({ orderBy: { hitCount: 'desc' } })
  return NextResponse.json({ words })
}

// POST — add word
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { word } = await req.json()
  if (!word?.trim()) return NextResponse.json({ error: 'Thiếu từ cần cấm' }, { status: 400 })

  const normalized = word.trim().toLowerCase()
  const record = await prisma.bannedWord.upsert({
    where: { word: normalized },
    create: { word: normalized },
    update: { isActive: true },
  })
  invalidateBannedWordsCache()
  return NextResponse.json({ word: record })
}

// PATCH — toggle active / bulk import
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, isActive, bulkWords } = await req.json()

  // Bulk import: nhận mảng từ ["tu1","tu2"]
  if (bulkWords && Array.isArray(bulkWords)) {
    const words = bulkWords.map((w: string) => w.trim().toLowerCase()).filter(Boolean)
    await prisma.$transaction(
      words.map(word => prisma.bannedWord.upsert({
        where: { word },
        create: { word },
        update: { isActive: true },
      }))
    )
    invalidateBannedWordsCache()
    return NextResponse.json({ imported: words.length })
  }

  if (id === undefined) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const updated = await prisma.bannedWord.update({ where: { id }, data: { isActive } })
  invalidateBannedWordsCache()
  return NextResponse.json({ word: updated })
}

// DELETE
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.bannedWord.delete({ where: { id } })
  invalidateBannedWordsCache()
  return NextResponse.json({ success: true })
}
