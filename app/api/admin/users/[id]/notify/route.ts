import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin() { const s = await auth(); return s?.user?.role === 'ADMIN' }

// POST /api/admin/users/[id]/notify
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, message, link } = await req.json().catch(() => ({}))
  if (!title || !message) {
    return NextResponse.json({ error: 'Tiêu đề và nội dung là bắt buộc' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 })

  await prisma.notification.create({
    data: {
      userId: params.id,
      type: 'ADMIN',
      title,
      message,
      link: link || null,
    },
  })

  return NextResponse.json({ success: true })
}
