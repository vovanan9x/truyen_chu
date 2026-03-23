import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import os from 'os'

// POST /api/admin/crawl/queue/claim
// Atomically claims the next pending queue item using PostgreSQL SKIP LOCKED
// Safe to call from multiple VPS simultaneously — no race conditions
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user?.role ?? ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const workerId: string = body.workerId ?? `${os.hostname()}-api`

  // PostgreSQL SKIP LOCKED: atomic claim, prevents two workers claiming same item
  const result = await prisma.$queryRaw<Array<{
    id: string; url: string; fromChapter: number; toChapter: number;
    concurrency: number; batchDelay: number; overwrite: boolean; attempts: number;
  }>>`
    UPDATE crawl_queue
    SET status = 'running',
        "workerId" = ${workerId},
        "startedAt" = NOW(),
        attempts = attempts + 1
    WHERE id = (
      SELECT id FROM crawl_queue
      WHERE status = 'pending'
        AND attempts < "maxAttempts"
      ORDER BY priority DESC, "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, url, "fromChapter", "toChapter", concurrency, "batchDelay", overwrite, attempts
  `

  if (!result || result.length === 0)
    return NextResponse.json({ item: null }, { status: 204 })

  return NextResponse.json({ item: result[0] })
}
