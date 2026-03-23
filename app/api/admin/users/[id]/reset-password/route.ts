import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function isAdmin() { const s = await auth(); return s?.user?.role === 'ADMIN' }

// POST /api/admin/users/[id]/reset-password
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { newPassword } = await req.json().catch(() => ({}))
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash },
  })

  return NextResponse.json({ success: true })
}
