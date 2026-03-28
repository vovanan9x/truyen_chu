import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runBatchSchedule } from '@/lib/scheduler'
import { createBatchJob, updateBatchJob } from '@/lib/crawl-jobs'

// No maxDuration — returns immediately, job runs in background
// POST /api/admin/crawl/batch-schedules/run
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Create job record immediately
  const jobId = createBatchJob(id)

  // Fire-and-forget: do NOT await — closes HTTP connection but Promise continues on server
  runBatchSchedule(id, jobId).catch((e: Error) => {
    updateBatchJob(jobId, {
      status: 'error',
      finishedAt: new Date(),
      error: e?.message?.slice(0, 200) ?? 'Unknown error',
    })
  })

  // Return jobId so client can poll status
  return NextResponse.json({ jobId, running: true })
}
