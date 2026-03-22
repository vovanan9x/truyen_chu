import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const socialUrlSchema = z.string().max(255)
  .refine(v => v === '' || v.startsWith('https://') || v.startsWith('http://'), 'Link mạng xã hội phải bắt đầu bằng https://')
  .optional()

const schema = z.object({
  name: z.string().min(2, 'Tên phải ít nhất 2 ký tự').max(50, 'Tối đa 50 ký tự').optional(),
  bio: z.string().max(300, 'Giới thiệu tối đa 300 ký tự').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', '']).optional(),
  hometown: z.string().max(100, 'Quê quán tối đa 100 ký tự').optional(),
  facebookUrl: socialUrlSchema,
  tiktokUrl: socialUrlSchema,
  instagramUrl: socialUrlSchema,
  // Chấp nhận URL đầy đủ (https://...) HOẶC path tương đối (/avatars/...) hoặc rỗng
  avatar: z.string()
    .refine(v => v === '' || v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://'),
      'URL avatar không hợp lệ')
    .optional(),
})

// GET /api/user/profile
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user as any).findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, avatar: true, bio: true,
      gender: true, hometown: true, facebookUrl: true, tiktokUrl: true, instagramUrl: true,
      coinBalance: true, role: true, createdAt: true,
    },
  })

  return NextResponse.json(user)
}

// PATCH /api/user/profile
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const data: Record<string, string | null> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio
  if (parsed.data.avatar !== undefined) data.avatar = parsed.data.avatar || null
  if (parsed.data.gender !== undefined) data.gender = parsed.data.gender || null
  if (parsed.data.hometown !== undefined) data.hometown = parsed.data.hometown || null
  if (parsed.data.facebookUrl !== undefined) data.facebookUrl = parsed.data.facebookUrl || null
  if (parsed.data.tiktokUrl !== undefined) data.tiktokUrl = parsed.data.tiktokUrl || null
  if (parsed.data.instagramUrl !== undefined) data.instagramUrl = parsed.data.instagramUrl || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user as any).update({
    where: { id: session.user.id },
    data,
    select: {
      id: true, name: true, email: true, avatar: true, bio: true,
      gender: true, hometown: true, facebookUrl: true, tiktokUrl: true, instagramUrl: true,
    },
  })

  return NextResponse.json({ success: true, user })
}
