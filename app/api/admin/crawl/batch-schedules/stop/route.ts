import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelBatchSchedule } from '@/lib/scheduler'

// POST /api/admin/crawl/batch-schedules/stop — cancel a running batch schedule
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  cancelBatchSchedule(id)
  return NextResponse.json({ success: true, message: 'Đã gửi tín hiệu dừng — sẽ dừng sau khi truyện hiện tại xong' })
}
