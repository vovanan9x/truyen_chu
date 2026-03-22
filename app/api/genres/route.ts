import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/genres — public list of all genres
export async function GET() {
  const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json({ genres })
}
