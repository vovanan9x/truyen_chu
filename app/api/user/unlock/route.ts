import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const { chapterId } = await req.json()
  if (!chapterId) return NextResponse.json({ error: 'Thiếu chapterId' }, { status: 400 })

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      story: { select: { id: true, ownerId: true, commissionRate: true } },
    },
  })

  if (!chapter) return NextResponse.json({ error: 'Không tìm thấy chương' }, { status: 404 })
  if (!chapter.isLocked) return NextResponse.json({ success: true, message: 'Chương miễn phí' })

  // Check already unlocked
  const existing = await prisma.unlockedChapter.findUnique({
    where: { userId_chapterId: { userId: session.user.id, chapterId } },
  })
  if (existing) return NextResponse.json({ success: true, message: 'Đã mở khoá trước đó' })

  // Check coin balance
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { coinBalance: true },
  })
  if (!user || user.coinBalance < chapter.coinCost) {
    return NextResponse.json({ error: 'Không đủ xu', code: 'INSUFFICIENT_COINS' }, { status: 402 })
  }

  // Tính hoa hồng
  const ownerId = chapter.story.ownerId
  const commissionRate = chapter.story.commissionRate ?? 70
  const ownerShare = ownerId ? Math.floor(chapter.coinCost * commissionRate / 100) : 0

  // Deduct coins & create unlock record + commission atomically
  await prisma.$transaction([
    // Trừ xu người đọc
    prisma.user.update({
      where: { id: session.user.id },
      data: { coinBalance: { decrement: chapter.coinCost } },
    }),
    // Tạo unlock record
    prisma.unlockedChapter.create({
      data: { userId: session.user.id, chapterId },
    }),
    // Transaction người đọc
    prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: 'UNLOCK',
        amount: chapter.coinCost,
        coinAmount: -chapter.coinCost,
        status: 'SUCCESS',
        providerRef: chapterId,
        meta: { chapterId, storyId: chapter.storyId },
      },
    }),
    // Hoa hồng cho tác giả/dịch giả (nếu có owner)
    ...(ownerId && ownerShare > 0 ? [
      prisma.user.update({
        where: { id: ownerId },
        data: { coinBalance: { increment: ownerShare } },
      }),
      prisma.transaction.create({
        data: {
          userId: ownerId,
          type: 'DONATE',
          amount: 0,
          coinAmount: ownerShare,
          status: 'SUCCESS',
          providerRef: chapterId,
          meta: {
            note: `Hoa hồng ${commissionRate}% từ chương ${chapter.chapterNum}`,
            chapterId,
            storyId: chapter.storyId,
            readerUserId: session.user.id,
          },
        },
      }),
      prisma.story.update({
        where: { id: chapter.storyId },
        data: { totalEarnings: { increment: ownerShare } },
      }),
    ] : []),
  ])

  return NextResponse.json({ success: true })
}

// Check if current user has unlocked a chapter
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ unlocked: false })

  const chapterId = req.nextUrl.searchParams.get('chapterId')
  if (!chapterId) return NextResponse.json({ unlocked: false })

  const record = await prisma.unlockedChapter.findUnique({
    where: { userId_chapterId: { userId: session.user.id, chapterId } },
  })
  return NextResponse.json({ unlocked: !!record })
}
