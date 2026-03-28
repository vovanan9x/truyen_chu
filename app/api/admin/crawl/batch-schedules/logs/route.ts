import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getBatchLogs, isBatchRunning } from '@/lib/scheduler'

// GET /api/admin/crawl/batch-schedules/logs?id=<scheduleId>&since=<n>
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  const since = parseInt(req.nextUrl.searchParams.get('since') ?? '0', 10)
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const logs = getBatchLogs(id, since)
  const running = isBatchRunning(id)
  return NextResponse.json({ logs, total: since + logs.length, running })
}
