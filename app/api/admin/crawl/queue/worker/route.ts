import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { startWorker, stopWorker, getWorkerStatus } from '@/lib/crawl-worker'

// GET — worker status
export async function GET() {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user?.role ?? ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(getWorkerStatus())
}

// POST — start or stop worker
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user?.role ?? ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, baseUrl } = await req.json()

  if (action === 'start') {
    const host = baseUrl ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
    const result = startWorker({ baseUrl: host })
    return NextResponse.json(result)
  }

  if (action === 'stop') {
    const result = stopWorker()
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Invalid action — use start or stop' }, { status: 400 })
}
