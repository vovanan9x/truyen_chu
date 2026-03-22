import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới ít nhất 6 ký tự').max(100),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })

  if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 })

  // User đăng nhập bằng OAuth (Google) sẽ không có passwordHash
  if (!user.passwordHash) {
    return NextResponse.json({ error: 'Tài khoản này đăng nhập bằng Google, không có mật khẩu để đổi' }, { status: 400 })
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 })
  }

  const newHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  })

  return NextResponse.json({ success: true })
}
