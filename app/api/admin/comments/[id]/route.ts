import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin() { const s = await auth(); return s?.user?.role === 'ADMIN' }

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await prisma.comment.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
