import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin() { const s = await auth(); return s?.user?.role === 'ADMIN' }

// GET /api/admin/users/[id]/comments
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const comments = await prisma.comment.findMany({
    where: { userId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      content: true,
      isPinned: true,
      createdAt: true,
      story: { select: { title: true, slug: true } },
      _count: { select: { replies: true } },
    },
  })

  return NextResponse.json({ comments })
}
