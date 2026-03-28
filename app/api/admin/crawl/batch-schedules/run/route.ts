import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runBatchSchedule } from '@/lib/scheduler'

export const maxDuration = 300

// POST /api/admin/crawl/batch-schedules/run — trigger a batch schedule now
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user.role as string))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const result = await runBatchSchedule(id)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Lỗi server' }, { status: 500 })
  }
}
