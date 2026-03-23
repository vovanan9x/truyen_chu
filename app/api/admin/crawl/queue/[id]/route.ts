import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/admin/crawl/queue/[id] — update item status after crawl
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session || !['ADMIN', 'MOD'].includes(session.user?.role ?? ''))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = await req.json()
  const {
    status,          // 'done' | 'failed' | 'pending' (retry)
    storyId,
    storyTitle,
    importedChapters,
    error,
  } = body as {
    status: string
    storyId?: string
    storyTitle?: string
    importedChapters?: number
    error?: string
  }

  const data: Record<string, any> = { status }
  if (status === 'done' || status === 'failed') data.finishedAt = new Date()
  if (storyId) data.storyId = storyId
  if (storyTitle) data.storyTitle = storyTitle
  if (importedChapters !== undefined) data.importedChapters = importedChapters
  if (error) data.error = error
  if (status === 'pending') {
    // Reset for retry
    data.workerId = null
    data.startedAt = null
    data.finishedAt = null
    data.error = null
  }

  const item = await prisma.crawlQueue.update({ where: { id }, data })
  return NextResponse.json({ item })
}
