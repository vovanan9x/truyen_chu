/**
 * In-memory Job Queue for crawl operations.
 * Persists across requests within the same server process.
 * On server restart, jobs are cleared (acceptable for dev/small prod).
 */

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface CrawlJob {
  id: string
  url: string
  storyTitle?: string
  storyId?: string
  fromChapter: number
  toChapter: number
  totalChapters: number
  importedChapters: number
  failedChapters: number[]
  skippedChapters: number[]
  status: JobStatus
  logs: string[]
  createdAt: Date
  updatedAt: Date
  error?: string
}

// Global singleton map
const jobStore = new Map<string, CrawlJob>()
const MAX_JOBS = 100 // Keep last 100 jobs

// Cancelled job IDs — checked inside crawl loops to stop processing
const cancelledJobs = new Set<string>()

export function createJob(id: string, data: Partial<CrawlJob>): CrawlJob {
  const job: CrawlJob = {
    id, url: '', fromChapter: 1, toChapter: 9999,
    totalChapters: 0, importedChapters: 0,
    failedChapters: [], skippedChapters: [],
    status: 'pending', logs: [], createdAt: new Date(), updatedAt: new Date(),
    ...data,
  }
  // Enforce max size
  if (jobStore.size >= MAX_JOBS) {
    const oldest = Array.from(jobStore.keys())[0]
    jobStore.delete(oldest)
  }
  jobStore.set(id, job)
  return job
}

export function updateJob(id: string, updates: Partial<CrawlJob>): CrawlJob | null {
  const job = jobStore.get(id)
  if (!job) return null
  Object.assign(job, updates, { updatedAt: new Date() })
  return job
}

export function addLog(id: string, message: string) {
  const job = jobStore.get(id)
  if (!job) return
  const time = new Date().toLocaleTimeString('vi-VN')
  job.logs.push(`[${time}] ${message}`)
  job.updatedAt = new Date()
}

export function getJob(id: string): CrawlJob | undefined {
  return jobStore.get(id)
}

export function getAllJobs(): CrawlJob[] {
  return Array.from(jobStore.values()).sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime()
  )
}

export function deleteJob(id: string) {
  jobStore.delete(id)
  cancelledJobs.delete(id)
}

/** Đánh dấu job bị huỷ — vòng lặp crawl sẽ thoát sớm */
export function cancelJob(id: string): boolean {
  const job = jobStore.get(id)
  if (!job || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return false
  }
  cancelledJobs.add(id)
  updateJob(id, { status: 'cancelled' })
  addLog(id, '🛑 Job bị dừng bởi admin')
  return true
}

/** Kiểm tra trong vòng lặp crawl — trả về true nếu nên dừng */
export function isCancelled(id: string): boolean {
  return cancelledJobs.has(id)
}
