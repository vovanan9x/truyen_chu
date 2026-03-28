import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getBatchJob } from '@/lib/crawl-jobs'

// GET /api/admin/crawl/batch-schedules/run/status?jobId=
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

  const job = getBatchJob(jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json({
    jobId: job.id,
    scheduleId: job.scheduleId,
    status: job.status,
    running: job.status === 'running',
    startedAt: job.startedAt,
    finishedAt: job.finishedAt ?? null,
    result: job.result ?? null,
    error: job.error ?? null,
  })
}
