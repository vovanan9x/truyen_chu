import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/permissions'

// PATCH — ADMIN approve hoặc reject request
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { isAdmin, userId } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, adminNote } = await req.json() // action: 'approve' | 'reject'
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action phải là approve hoặc reject' }, { status: 400 })
  }

  const modReq = await prisma.modRequest.findUnique({ where: { id: params.id } })
  if (!modReq) return NextResponse.json({ error: 'Không tìm thấy request' }, { status: 404 })
  if (modReq.status !== 'PENDING') {
    return NextResponse.json({ error: 'Request đã được xử lý' }, { status: 409 })
  }

  if (action === 'reject') {
    await prisma.modRequest.update({
      where: { id: params.id },
      data: { status: 'REJECTED', adminNote: adminNote || null, reviewedBy: userId },
    })
    return NextResponse.json({ success: true, status: 'REJECTED' })
  }

  // APPROVE — thực thi action
  try {
    if (modReq.type === 'DELETE_STORY') {
      await prisma.story.delete({ where: { id: modReq.targetId } })
    } else if (modReq.type === 'EDIT_USER') {
      const payload = modReq.payload as any
      const { role, coinDelta, note, name, email, bio, avatar } = payload
      const ops: any[] = []
      const userUpdate: Record<string, any> = {}
      if (name !== undefined) userUpdate.name = name
      if (email !== undefined) userUpdate.email = email
      if (bio !== undefined) userUpdate.bio = bio || null
      if (avatar !== undefined) userUpdate.avatar = avatar || null
      if (role !== undefined) userUpdate.role = role
      if (coinDelta) {
        userUpdate.coinBalance = { increment: coinDelta }
        ops.push(prisma.transaction.create({
          data: {
            userId: modReq.targetId, type: coinDelta > 0 ? 'DEPOSIT' : 'UNLOCK',
            amount: Math.abs(coinDelta), coinAmount: coinDelta, status: 'SUCCESS',
            provider: 'admin', providerRef: note ?? 'mod-approved',
          }
        }))
      }
      if (Object.keys(userUpdate).length > 0) {
        ops.unshift(prisma.user.update({ where: { id: modReq.targetId }, data: userUpdate }))
      }
      if (ops.length > 0) await prisma.$transaction(ops)
    } else if (modReq.type === 'BAN_USER') {
      const payload = modReq.payload as any
      await prisma.user.update({
        where: { id: modReq.targetId },
        data: {
          isBanned: true, bannedAt: new Date(),
          banReason: payload.banReason || null,
          banExpiry: payload.banDays ? new Date(Date.now() + payload.banDays * 86400000) : null,
        },
      })
    }

    await prisma.modRequest.update({
      where: { id: params.id },
      data: { status: 'APPROVED', adminNote: adminNote || null, reviewedBy: userId },
    })

    return NextResponse.json({ success: true, status: 'APPROVED' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi thực thi' }, { status: 500 })
  }
}
