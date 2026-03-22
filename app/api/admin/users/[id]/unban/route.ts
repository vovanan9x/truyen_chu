import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { isBanned: false, bannedAt: null, banReason: null, banExpiry: null },
    select: { id: true, name: true, isBanned: true }
  })
  return NextResponse.json({ user })
}
