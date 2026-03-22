import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getJob, getAllJobs, deleteJob } from '@/lib/crawl-jobs'

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (params.jobId === 'list') {
    const jobs = getAllJobs().map(j => ({
      id: j.id, url: j.url, storyTitle: j.storyTitle, storyId: j.storyId,
      status: j.status, importedChapters: j.importedChapters,
      totalChapters: j.totalChapters, failedChapters: j.failedChapters.length,
      createdAt: j.createdAt, updatedAt: j.updatedAt, error: j.error,
    }))
    return NextResponse.json({ jobs })
  }

  const job = getJob(params.jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function DELETE(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  deleteJob(params.jobId)
  return NextResponse.json({ success: true })
}
