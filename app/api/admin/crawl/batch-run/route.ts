import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runBatchWithOptions, type BatchRunOptions } from '@/lib/scheduler'
import { createBatchJob, updateBatchJob } from '@/lib/crawl-jobs'
import { randomUUID } from 'crypto'

// POST /api/admin/crawl/batch-run
// Fire-and-forget manual batch crawl with full options support
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await req.json()
  const {
    categoryUrl,
    maxPages = 3,
    maxStories = 50,
    fromChapter = 1,
    skipExisting = true,
    updateExisting = false,
    overwrite = false,
    concurrency = 3,
    chapterDelay = 500,
    storyDelay = 2000,
  } = body

  if (!categoryUrl?.trim())
    return NextResponse.json({ error: 'Thiếu categoryUrl' }, { status: 400 })

  const runKey = `manual_${randomUUID().slice(0, 8)}`
  const jobId = createBatchJob(runKey)

  const opts: BatchRunOptions = {
    name: 'Manual batch',
    categoryUrl: categoryUrl.trim(),
    maxPages, maxStories, fromChapter,
    skipExisting, updateExisting, overwrite,
    concurrency, chapterDelay, storyDelay,
    runKey,
    // No scheduleId — don't write BatchCrawlRun to DB for manual runs
  }

  // Fire-and-forget
  runBatchWithOptions(opts, jobId).catch((e: Error) => {
    updateBatchJob(jobId, {
      status: 'error',
      finishedAt: new Date(),
      error: e?.message?.slice(0, 200) ?? 'Unknown error',
    })
  })

  return NextResponse.json({ jobId, runKey, running: true })
}

// GET /api/admin/crawl/batch-run?runKey= — get realtime logs
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { getBatchLogs, isBatchRunning } = await import('@/lib/scheduler')
  const runKey = req.nextUrl.searchParams.get('runKey') ?? ''
  const since = parseInt(req.nextUrl.searchParams.get('since') ?? '0')
  const logs = getBatchLogs(runKey, since)
  return NextResponse.json({ logs, total: since + logs.length, running: isBatchRunning(runKey) })
}
