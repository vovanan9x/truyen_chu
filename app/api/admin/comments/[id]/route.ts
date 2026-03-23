import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/permissions'

async function checkMod() { const s = await getAdminSession(); return s.isAdminOrMod ? s : null }

// PATCH — pin/unpin, or other updates
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkMod())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { isPinned } = await req.json().catch(() => ({}))
  const comment = await prisma.comment.update({
    where: { id: params.id },
    data: { ...(isPinned !== undefined ? { isPinned } : {}) },
    select: { id: true, isPinned: true },
  })
  return NextResponse.json({ success: true, comment })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkMod())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.comment.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

