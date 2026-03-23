/**
 * Distributed crawl worker — runs on each VPS
 * 
 * Usage:
 *   import { startWorker, stopWorker, getWorkerStatus } from '@/lib/crawl-worker'
 *   startWorker({ baseUrl: 'https://your-site.com' })
 */

import os from 'os'

interface WorkerOptions {
  baseUrl: string      // Self URL for API calls (e.g. http://localhost:3000)
  pollIntervalMs?: number  // How often to poll queue when idle (default 5s)
  authCookie?: string  // Admin session cookie for internal API calls
}

interface WorkerState {
  running: boolean
  currentItemId: string | null
  currentUrl: string | null
  currentJobId: string | null
  processedCount: number
  errorCount: number
  startedAt: Date | null
  workerId: string
}

const state: WorkerState = {
  running: false,
  currentItemId: null,
  currentUrl: null,
  currentJobId: null,
  processedCount: 0,
  errorCount: 0,
  startedAt: null,
  workerId: `${os.hostname()}-${process.pid}`,
}

let stopSignal = false
let workerLoop: Promise<void> | null = null

export function getWorkerStatus() {
  return { ...state }
}

export function startWorker(opts: WorkerOptions) {
  if (state.running) return { started: false, message: 'Already running' }
  stopSignal = false
  state.running = true
  state.startedAt = new Date()
  state.processedCount = 0
  state.errorCount = 0
  workerLoop = runLoop(opts).finally(() => {
    state.running = false
    state.currentItemId = null
    state.currentUrl = null
    state.currentJobId = null
  })
  return { started: true, workerId: state.workerId }
}

export function stopWorker() {
  stopSignal = true
  return { stopping: true, message: 'Will stop after current item completes' }
}

async function runLoop(opts: WorkerOptions) {
  const { baseUrl, pollIntervalMs = 5000 } = opts
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Internal API calls use auth via same session; add cookie if needed
  }

  while (!stopSignal) {
    // 1. Claim next item
    let item: any = null
    try {
      const res = await fetch(`${baseUrl}/api/admin/crawl/queue/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ workerId: state.workerId }),
      })
      if (res.status === 204) {
        // Queue empty — wait and try again
        await sleep(pollIntervalMs)
        continue
      }
      const data = await res.json()
      item = data.item
    } catch {
      await sleep(pollIntervalMs)
      continue
    }

    if (!item) { await sleep(pollIntervalMs); continue }

    state.currentItemId = item.id
    state.currentUrl = item.url

    // 2. Start crawl job
    let jobId: string | null = null
    try {
      const startRes = await fetch(`${baseUrl}/api/admin/crawl/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: item.url,
          fromChapter: item.fromChapter,
          toChapter: item.toChapter,
          batchDelay: item.batchDelay,
          overwrite: item.overwrite,
          concurrency: item.concurrency,
        }),
      })
      if (!startRes.ok) throw new Error(`Start failed: HTTP ${startRes.status}`)
      const startData = await startRes.json()
      jobId = startData.jobId
      state.currentJobId = jobId
    } catch (e: any) {
      await patchItem(baseUrl, headers, item.id, { status: 'failed', error: e?.message ?? 'Start failed' })
      state.errorCount++
      state.currentItemId = null
      state.currentUrl = null
      state.currentJobId = null
      continue
    }

    // 3. Poll job status until done
    let done = false
    let importedChapters = 0
    let storyId: string | undefined
    let storyTitle: string | undefined
    let pollAttempts = 0
    const MAX_POLL = 720 // 720 × 5s = 60 min max

    while (!done && pollAttempts < MAX_POLL) {
      await sleep(5000)
      try {
        const statusRes = await fetch(`${baseUrl}/api/admin/crawl/status/${jobId}`, { headers })
        if (statusRes.status === 404) { done = true; break } // Job gone = completed
        if (!statusRes.ok) { pollAttempts++; continue }
        const st = await statusRes.json()
        importedChapters = st.importedChapters ?? 0
        storyId = st.storyId
        storyTitle = st.storyTitle
        if (st.status === 'completed' || st.status === 'failed' || st.status === 'cancelled') {
          done = true
        }
      } catch { /* network hiccup — keep polling */ }
      pollAttempts++
    }

    // 4. Mark queue item done/failed
    await patchItem(baseUrl, headers, item.id, {
      status: done ? 'done' : 'failed',
      storyId,
      storyTitle,
      importedChapters,
      error: !done ? 'Timeout — exceeded 60 minute limit' : undefined,
    })

    state.processedCount++
    state.currentItemId = null
    state.currentUrl = null
    state.currentJobId = null

    // Brief pause between stories
    if (!stopSignal) await sleep(2000)
  }
}

async function patchItem(
  baseUrl: string,
  headers: Record<string, string>,
  id: string,
  data: Record<string, any>
) {
  try {
    await fetch(`${baseUrl}/api/admin/crawl/queue/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    })
  } catch { /* best effort */ }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
