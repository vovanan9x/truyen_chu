import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { cancelJob, getJob } from '@/lib/crawl-jobs'

// POST /api/admin/crawl/status/[jobId]/cancel — dừng job đang chạy
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const job = getJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const cancelled = cancelJob(params.jobId)
  if (!cancelled) {
    return NextResponse.json(
      { error: `Không thể dừng job ở trạng thái "${job.status}"` },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true, message: '🛑 Đã gửi lệnh dừng — job sẽ dừng sau batch hiện tại' })
}
