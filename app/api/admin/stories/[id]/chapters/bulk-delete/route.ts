import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/admin/stories/[id]/chapters/bulk-delete
// Body: { ids: string[] }
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Không có chương nào được chọn' }, { status: 400 })
  }
  if (ids.length > 500) {
    return NextResponse.json({ error: 'Tối đa 500 chương mỗi lần xoá' }, { status: 400 })
  }

  // Double-check all chapters belong to this story (security)
  const count = await prisma.chapter.deleteMany({
    where: {
      id: { in: ids },
      storyId: params.id,
    },
  })

  return NextResponse.json({ deleted: count.count })
}
