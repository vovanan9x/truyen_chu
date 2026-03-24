'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Globe, Search, Loader2, Check, AlertCircle, ChevronDown,
  Clock, CheckCircle2, XCircle, RefreshCw, Trash2, ExternalLink,
  BookOpen, Settings2, List, CalendarClock, Wrench, Play, ToggleLeft,
  ToggleRight, PlusCircle, Save, Timer, Database, StopCircle, ShieldCheck, Wifi, WifiOff
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PreviewData { adapterName:string;title:string;author:string;description:string;coverUrl:string;status:string;genres:string[];totalChapters:number;previewChapters:{num:number;title:string;url:string}[] }
interface JobSummary { id:string;url:string;storyTitle?:string;storyId?:string;status:'pending'|'running'|'completed'|'failed'|'cancelled';importedChapters:number;totalChapters:number;failedChapters:number;createdAt:string;updatedAt:string;error?:string }
interface FullJob extends JobSummary { logs:string[];fromChapter:number;toChapter:number;skippedChapters:number[];failedChaptersNums:number[] }
interface CrawlSchedule { id:string;storyId:string;sourceUrl:string;intervalMinutes:number;isActive:boolean;lastChapterNum:number;lastRunAt:string|null;nextRunAt:string|null;lastError:string|null;story:{id:string;title:string;slug:string;coverUrl:string|null} }
interface SiteConfig { id:string;domain:string;name:string;titleSelector?:string;authorSelector?:string;coverSelector?:string;descSelector?:string;genreSelector?:string;chapterListSel?:string;chapterContentSel?:string;chapterTitleSel?:string;nextPageSel?:string;chapterApiUrl?:string;storyIdPattern?:string;chapterApiJson?:string;cookies?:string;notes?:string;isActive:boolean }
interface CrawlLog { id:string;scheduleId:string|null;storyId:string|null;storyTitle:string|null;sourceUrl:string;startedAt:string;finishedAt:string|null;status:string;chaptersImported:number;chaptersTotal:number;errorMessage:string|null;triggeredBy:string }

// ─── Helper components ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; icon: any; label: string }> = {
    pending:   { cls: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Chờ' },
    running:   { cls: 'bg-blue-100 text-blue-700', icon: Loader2, label: 'Đang chạy' },
    completed: { cls: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Thành công' },
    failed:    { cls: 'bg-red-100 text-red-700', icon: XCircle, label: 'Thất bại' },
    cancelled: { cls: 'bg-gray-100 text-gray-600', icon: StopCircle, label: 'Đã dừng' },
  }
  const { cls, icon: Icon, label } = cfg[status] ?? cfg.pending
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}><Icon className={`w-3 h-3 ${status==='running'?'animate-spin':''}`}/>{label}</span>
}

function ProgressBar({ imported, total }: { imported: number; total: number }) {
  const pct = total > 0 ? Math.round((imported / total) * 100) : 0
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{imported}/{total} chương</span><span>{pct}%</span></div>
      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }}/></div>
    </div>
  )
}

const inputCls = 'px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const labelCls = 'text-xs font-medium text-muted-foreground block mb-1'

function logCls(log: string) {
  if (log.includes('❌')) return 'text-destructive'
  if (log.includes('✅') || log.includes('🎉')) return 'text-green-400'
  if (log.includes('⚠️')) return 'text-amber-500'
  return 'text-foreground/80'
}

function LogPanel({ logs, isLive, scrollRef, maxH = 'max-h-64' }: {
  logs: string[]; isLive?: boolean; scrollRef?: React.RefObject<HTMLDivElement>; maxH?: string
}) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <RefreshCw className={`w-3 h-3 ${isLive ? 'animate-spin' : ''}`}/>
        {isLive ? 'Log realtime' : 'Log'}
      </div>
      <div className={`${maxH} overflow-y-auto p-3 font-mono text-xs space-y-0.5`}>
        {logs.map((log, i) => <div key={i} className={logCls(log)}>{log}</div>)}
        {scrollRef && <div ref={scrollRef}/>}
      </div>
    </div>
  )
}

function CrawlJobCard({ job, expanded, expandedLogs, onExpand, onDelete, onCancel }: {
  job: JobSummary; expanded: boolean; expandedLogs: string[];
  onExpand: () => void; onDelete: () => void; onCancel?: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <StatusBadge status={job.status}/>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{job.storyTitle ?? job.url}</p>
          <p className="text-xs text-muted-foreground truncate">{job.url}</p>
          <div className="flex items-center gap-3 mt-1.5">
            {job.failedChapters > 0 && <span className="text-xs text-destructive">❌ {job.failedChapters} lỗi</span>}
            <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString('vi-VN')}</span>
          </div>
          {job.totalChapters > 0 && <ProgressBar imported={job.importedChapters} total={job.totalChapters}/>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Nút Dừng — chỉ hiện khi job đang pending/running */}
          {(job.status === 'running' || job.status === 'pending') && onCancel && (
            <button
              onClick={onCancel}
              title="Dừng crawl"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
            >
              <StopCircle className="w-3.5 h-3.5"/>
              Dừng
            </button>
          )}
          {job.storyId && <Link href={`/admin/truyen/${job.storyId}`} className="p-2 rounded-lg hover:bg-muted" title="Xem truyện"><ExternalLink className="w-4 h-4"/></Link>}
          <button onClick={onExpand} className="p-2 rounded-lg hover:bg-muted">
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}/>
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 text-destructive"><Trash2 className="w-4 h-4"/></button>
        </div>
      </div>
      {expanded && expandedLogs.length > 0 && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <LogPanel logs={expandedLogs} maxH="max-h-48"/>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminCrawlerPage() {
  const [tab, setTab] = useState<'new'|'history'|'db-logs'|'schedule'|'sites'|'batch'|'proxy'>('new')

  // --- Crawl new tab ---
  const [url, setUrl] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<PreviewData|null>(null)
  const [previewError, setPreviewError] = useState('')
  const [fromChapter, setFromChapter] = useState(1)
  const [toChapter, setToChapter] = useState(9999)
  const [batchDelay, setBatchDelay] = useState(500)
  const [concurrency, setConcurrency] = useState(5)
  const [overwrite, setOverwrite] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showChapters, setShowChapters] = useState(false)
  const [addScheduleAfter, setAddScheduleAfter] = useState(false)
  const [schedInterval, setSchedInterval] = useState(30)
  const [activeJobId, setActiveJobId] = useState<string|null>(null)
  const [activeJob, setActiveJob] = useState<FullJob|null>(null)
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [expandedJobId, setExpandedJobId] = useState<string|null>(null)
  const [expandedLogs, setExpandedLogs] = useState<string[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const batchStopRef = useRef(false) // signals batch for-loop to stop

  // --- Schedule tab ---
  const [schedules, setSchedules] = useState<CrawlSchedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [runningSchedule, setRunningSchedule] = useState<string|null>(null)
  const [schedulerRunning, setSchedulerRunning] = useState<boolean|null>(null)

  // --- Site config tab ---
  const [siteConfigs, setSiteConfigs] = useState<SiteConfig[]>([])
  const [siteLoading, setSiteLoading] = useState(false)
  const [editingConfig, setEditingConfig] = useState<Partial<SiteConfig>|null>(null)
  const [savingConfig, setSavingConfig] = useState(false)
  const [saveError, setSaveError] = useState('')

  // --- Batch crawl tab ---
  const [batchCategoryUrl, setBatchCategoryUrl] = useState('')
  const [batchMaxPages, setBatchMaxPages] = useState(2)
  const [batchMaxStories, setBatchMaxStories] = useState(30)
  const [batchFromChapter, setBatchFromChapter] = useState(1)
  const [batchDelaySec, setBatchDelaySec] = useState(5)
  const [batchParallelStories, setBatchParallelStories] = useState(1)
  const [batchChapterConcurrency, setBatchChapterConcurrency] = useState(5)
  const [batchStories, setBatchStories] = useState<string[]>([])
  const [batchFetching, setBatchFetching] = useState(false)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchDone, setBatchDone] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchLogs, setBatchLogs] = useState<string[]>([])
  const [batchError, setBatchError] = useState('')
  const [batchStoryStatus, setBatchStoryStatus] = useState<Record<number,'pending'|'running'|'done'|'failed'>>({})
  const [batchErrorCount, setBatchErrorCount] = useState(0)
  const [autoDetecting, setAutoDetecting] = useState(false)
  const [detectPreview, setDetectPreview] = useState<Record<string,string>|null>(null)
  const [detectError, setDetectError] = useState('')
  // Persistent failed URL list — survives page refresh
  const [savedFailedUrls, setSavedFailedUrls] = useState<string[]>([])
  const FAILED_KEY = 'batch_crawl_failed_urls'

  // --- DB Logs tab ---
  const [dbLogs, setDbLogs] = useState<CrawlLog[]>([])
  const [dbLogsLoading, setDbLogsLoading] = useState(false)
  const [dbLogsPage, setDbLogsPage] = useState(1)
  const [dbLogsTotal, setDbLogsTotal] = useState(0)

  // --- Proxy tab ---
  const [proxyList, setProxyList] = useState('')   // newline-separated proxy URLs
  const [usePlaywright, setUsePlaywright] = useState(false)
  const [proxyLoading, setProxyLoading] = useState(false)
  const [proxySaving, setProxySaving] = useState(false)
  const [proxySaved, setProxySaved] = useState(false)
  const [testingProxy, setTestingProxy] = useState(false)
  const [proxyTestResult, setProxyTestResult] = useState<{ ok: boolean; ip?: string; error?: string } | null>(null)

  const SUPPORTED = [
    { name: 'TruyenFull', icon: '🟩' },
    { name: 'MeTruyenChu', icon: '🟦' },
    { name: 'Generic (best-effort)', icon: '⬜' },
  ]

  // Poll active job
  useEffect(() => {
    if (!activeJobId) return
    let lastUpdated = Date.now()
    let lastImported = -1
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/admin/crawl/status/${activeJobId}`)
      // Job not found (e.g. server restarted / hot reload cleared memory)
      if (res.status === 404) {
        clearInterval(pollRef.current!)
        setActiveJob(prev => prev ? { ...prev, status: 'failed', error: 'Job mất do server restart. Kiểm tra DB để xem dữ liệu đã lưu.' } : prev)
        fetchHistory()
        return
      }
      if (!res.ok) return
      const data: FullJob = await res.json()
      // Track staleness: if importedChapters hasn't changed in 30s, assume done
      if (data.importedChapters !== lastImported) {
        lastImported = data.importedChapters
        lastUpdated = Date.now()
      } else if (Date.now() - lastUpdated > 180000 && data.status === 'running') {
        // Stale — mark as likely completed
        setActiveJob({ ...data, status: 'completed' })
        clearInterval(pollRef.current!)
        fetchHistory()
        return
      }
      setActiveJob(data)
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(pollRef.current!)
        fetchHistory()
      }
    }, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeJobId])

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeJob?.logs])
  useEffect(() => { fetchHistory() }, [])
  // Load saved failed URLs from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('batch_crawl_failed_urls')
      if (raw) setSavedFailedUrls(JSON.parse(raw))
    } catch {}
  }, [])

  function addToFailedQueue(url: string) {
    setSavedFailedUrls(prev => {
      if (prev.includes(url)) return prev
      const next = [...prev, url]
      try { localStorage.setItem('batch_crawl_failed_urls', JSON.stringify(next)) } catch {}
      return next
    })
  }
  function removeFromFailedQueue(url: string) {
    setSavedFailedUrls(prev => {
      const next = prev.filter(u => u !== url)
      try { localStorage.setItem('batch_crawl_failed_urls', JSON.stringify(next)) } catch {}
      return next
    })
  }
  function clearFailedQueue() {
    setSavedFailedUrls([])
    try { localStorage.removeItem('batch_crawl_failed_urls') } catch {}
  }

  const fetchHistory = async () => {
    const res = await fetch('/api/admin/crawl/status/list')
    if (res.ok) { const data = await res.json(); setJobs(data.jobs) }
  }

  const fetchSchedules = async () => {
    setSchedulesLoading(true)
    const [schedRes, statusRes] = await Promise.all([
      fetch('/api/admin/crawl/schedules'),
      fetch('/api/admin/crawl/scheduler-status'),
    ])
    if (schedRes.ok) { const d = await schedRes.json(); setSchedules(d.schedules) }
    if (statusRes.ok) { const d = await statusRes.json(); setSchedulerRunning(d.schedulerRunning) }
    setSchedulesLoading(false)
  }

  const fetchSiteConfigs = async () => {
    setSiteLoading(true)
    const res = await fetch('/api/admin/crawl/site-configs')
    if (res.ok) { const d = await res.json(); setSiteConfigs(d.configs) }
    setSiteLoading(false)
  }

  const fetchDbLogs = async (page = 1) => {
    setDbLogsLoading(true)
    const res = await fetch(`/api/admin/crawl/logs?page=${page}`)
    if (res.ok) {
      const d = await res.json()
      setDbLogs(d.logs)
      setDbLogsTotal(d.total)
      setDbLogsPage(page)
    }
    setDbLogsLoading(false)
  }

  async function deleteDbLog(id: string) {
    await fetch(`/api/admin/crawl/logs?id=${id}`, { method: 'DELETE' })
    setDbLogs(prev => prev.filter(l => l.id !== id))
    setDbLogsTotal(t => t - 1)
  }

  useEffect(() => {
    if (tab === 'schedule') fetchSchedules()
    if (tab === 'sites') fetchSiteConfigs()
    if (tab === 'db-logs') fetchDbLogs(1)
    if (tab === 'proxy') fetchProxySettings()
  }, [tab])

  async function fetchProxySettings() {
    setProxyLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const d = await res.json()
        // Load proxy list (new format)
        let list = d.crawl_proxy_list ?? ''
        // Backward compat: build from old single proxy fields
        if (!list && d.crawl_proxy_host) {
          const { crawl_proxy_host: h, crawl_proxy_port: p, crawl_proxy_user: u, crawl_proxy_pass: pw } = d
          list = (u && pw) ? `http://${u}:${pw}@${h}:${p || 10000}` : `http://${h}:${p || 10000}`
        }
        setProxyList(list)
        setUsePlaywright(d.crawl_use_playwright === '1')
      }
    } finally { setProxyLoading(false) }
  }

  async function saveProxySettings() {
    setProxySaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crawl_proxy_list: proxyList,
          crawl_use_playwright: usePlaywright ? '1' : '',
        }),
      })
      setProxySaved(true)
      setTimeout(() => setProxySaved(false), 3000)
    } finally { setProxySaving(false) }
  }

  async function testProxy() {
    // Test the first proxy in the list
    const firstLine = proxyList.split('\n').map(s => s.trim()).find(s => s.startsWith('http'))
    if (!firstLine) { setProxyTestResult({ ok: false, error: 'Chưa có proxy nào' }); return }
    setTestingProxy(true); setProxyTestResult(null)
    try {
      // Parse proxy URL
      const u = new URL(firstLine)
      const res = await fetch('/api/admin/crawler/test-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: u.hostname,
          port: u.port || '10000',
          user: decodeURIComponent(u.username),
          pass: decodeURIComponent(u.password),
        }),
      })
      setProxyTestResult(await res.json())
    } catch (e: any) { setProxyTestResult({ ok: false, error: e?.message ?? 'Lỗi kết nối' }) }
    setTestingProxy(false)
  }

  async function handlePreview() {
    if (!url.trim()) return
    setPreviewing(true); setPreview(null); setPreviewError(''); setActiveJob(null); setActiveJobId(null)
    try {
      const res = await fetch('/api/admin/crawl/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
      const data = await res.json()
      if (!res.ok) { setPreviewError(data.error); return }
      setPreview(data)
      if (data.totalChapters > 0) setToChapter(data.totalChapters)
    } catch { setPreviewError('Lỗi kết nối đến server') }
    setPreviewing(false)
  }

  async function handleStart() {
    if (!preview) return
    setActiveJob(null)
    const res = await fetch('/api/admin/crawl/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, fromChapter, toChapter, batchDelay, overwrite, concurrency }),
    })
    const data = await res.json()
    if (res.ok) {
      setActiveJobId(data.jobId)
      setActiveJob({ id: data.jobId, url, status: 'pending', importedChapters: 0, totalChapters: toChapter - fromChapter + 1, failedChapters: 0, logs: [], fromChapter, toChapter, skippedChapters: [], failedChaptersNums: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
  }

  async function deleteJob(id: string) {
    await fetch(`/api/admin/crawl/status/${id}`, { method: 'DELETE' })
    setJobs(j => j.filter(x => x.id !== id))
  }

  async function expandJob(id: string) {
    if (expandedJobId === id) { setExpandedJobId(null); return }
    setExpandedJobId(id)
    const res = await fetch(`/api/admin/crawl/status/${id}`)
    if (res.ok) { const data = await res.json(); setExpandedLogs(data.logs ?? []) }
  }

  async function toggleSchedule(id: string, isActive: boolean) {
    await fetch('/api/admin/crawl/schedules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive }) })
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isActive } : s))
  }

  async function deleteSchedule(id: string) {
    await fetch(`/api/admin/crawl/schedules?id=${id}`, { method: 'DELETE' })
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  async function triggerNow(scheduleId: string) {
    setRunningSchedule(scheduleId)
    const res = await fetch('/api/admin/crawl/cron', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduleId }) })
    const d = await res.json()
    if (res.ok && d.jobId) {
      setActiveJobId(d.jobId)
      setTab('new')
    }
    setRunningSchedule(null)
  }

  async function changeInterval(id: string, intervalMinutes: number) {
    await fetch('/api/admin/crawl/schedules', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, intervalMinutes }) })
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, intervalMinutes } : s))
  }

  async function autoDetect() {
    if (!editingConfig?.domain) { setDetectError('Nhập URL hoặc domain trước'); return }
    setAutoDetecting(true); setDetectError(''); setDetectPreview(null)
    // Auto-prepend https:// if no protocol
    const targetUrl = editingConfig.domain.startsWith('http')
      ? editingConfig.domain
      : `https://${editingConfig.domain}`
    const res = await fetch('/api/admin/crawl/detect-selectors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
    })
    const d = await res.json()
    if (!res.ok) { setDetectError(d.error ?? 'Lỗi phát hiện'); setAutoDetecting(false); return }
    // Merge detected selectors into editingConfig
    const { detected, preview } = d
    setEditingConfig(prev => ({ ...prev, ...Object.fromEntries(Object.entries(detected).filter(([,v]) => v)) }))
    setDetectPreview(preview)
    setAutoDetecting(false)
  }

  async function saveConfig() {
    if (!editingConfig?.domain || !editingConfig?.name) {
      setSaveError('Vui lòng nhập domain và tên hiển thị')
      return
    }
    setSavingConfig(true)
    setSaveError('')
    try {
      const method = editingConfig.id ? 'PATCH' : 'POST'
      const res = await fetch('/api/admin/crawl/site-configs', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig),
      })
      // Safely parse response — server might return empty or non-JSON on error
      const text = await res.text()
      let d: any = {}
      try { d = JSON.parse(text) } catch { d = { error: text || `HTTP ${res.status}` } }
      console.log('[saveConfig]', res.status, d)
      if (res.ok) {
        fetchSiteConfigs()
        setEditingConfig(null)
        setDetectPreview(null)
        setDetectError('')
        setSaveError('')
      } else {
        setSaveError(d.error ?? `Lỗi ${res.status}: ${res.statusText}`)
      }
    } catch (e: any) {
      setSaveError(e?.message ?? 'Lỗi kết nối server')
    }
    setSavingConfig(false)
  }


  async function deleteSiteConfig(id: string) {
    await fetch(`/api/admin/crawl/site-configs?id=${id}`, { method: 'DELETE' })
    setSiteConfigs(prev => prev.filter(c => c.id !== id))
  }

  const TABS = [
    { value: 'new', label: 'Crawl mới', icon: Globe },
    { value: 'batch', label: 'Batch crawl', icon: List },
    { value: 'history', label: `Lịch sử (${jobs.length})`, icon: List },
    { value: 'db-logs', label: `Lịch sử DB${dbLogsTotal > 0 ? ` (${dbLogsTotal})` : ''}`, icon: Database },
    { value: 'schedule', label: 'Lịch tự động', icon: CalendarClock },
    { value: 'sites', label: 'Cấu hình site', icon: Wrench },
    { value: 'proxy', label: 'Proxy & Bypass', icon: ShieldCheck },
  ] as const

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="w-6 h-6 text-primary" /> Crawl truyện</h1>
        <p className="text-sm text-muted-foreground mt-1">Tự động lấy truyện từ nhiều nguồn, theo dõi lịch crawl và cấu hình selector per-site</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border flex-wrap">
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.value} onClick={() => setTab(t.value as any)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab===t.value?'border-primary text-primary':'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" />{t.label}
          </button>
        )})}
      </div>

      {/* ── Tab: Crawl mới ──────────────────────────────────────────────────────── */}
      {tab === 'new' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium">Nguồn hỗ trợ:</span>
            {SUPPORTED.map(s => <span key={s.name} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">{s.icon} {s.name}</span>)}
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">URL trang truyện</label>
              <div className="flex gap-3">
                <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key==='Enter'&&handlePreview()}
                  placeholder="https://truyenfull.vision/ten-truyen/" disabled={previewing} className={`flex-1 ${inputCls}`} />
                <button onClick={handlePreview} disabled={previewing||!url.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 shadow-sm whitespace-nowrap">
                  {previewing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                  {previewing ? 'Kiểm tra...' : 'Kiểm tra'}
                </button>
              </div>
              {previewError && <div className="flex items-start gap-2 mt-2 text-destructive text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>{previewError}</div>}
            </div>

            <div>
              <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <Settings2 className="w-4 h-4"/> Cấu hình nâng cao <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showConfig?'rotate-180':''}`}/>
              </button>
              {showConfig && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><label className={labelCls}>Từ chương</label><input type="number" min={1} value={fromChapter} onChange={e => setFromChapter(parseInt(e.target.value)||1)} className={inputCls+' w-full'}/></div>
                  <div><label className={labelCls}>Đến chương</label><input type="number" min={1} value={toChapter} onChange={e => setToChapter(parseInt(e.target.value)||9999)} className={inputCls+' w-full'}/></div>
                  <div>
                    <label className={labelCls}>Delay (ms)</label>
                    <select value={batchDelay} onChange={e => setBatchDelay(parseInt(e.target.value))} className={inputCls+' w-full'}>
                      <option value={0}>0ms (tối đa)</option>
                      <option value={100}>100ms (rất nhanh)</option>
                      <option value={300}>300ms (nhanh)</option><option value={500}>500ms</option><option value={1000}>1000ms (chậm)</option><option value={2000}>2000ms</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Song song (chương/lần)</label>
                    <select value={concurrency} onChange={e => setConcurrency(parseInt(e.target.value))} className={inputCls+' w-full'}>
                      <option value={1}>1 (an toàn)</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={8}>8 (nhanh)</option>
                      <option value={10}>10 (rất nhanh)</option>
                      <option value={15}>15 (mặc định mới)</option>
                      <option value={20}>20 (máy chủ mạnh)</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2.5">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} className="accent-primary w-4 h-4 rounded"/>
                      Ghi đè ch. có sẵn
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {preview && !activeJob && (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">Adapter: {preview.adapterName}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${preview.status==='COMPLETED'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>
                  {preview.status==='COMPLETED'?'✅ Hoàn thành':preview.status==='HIATUS'?'⏸ Tạm dừng':'🔵 Đang ra'}
                </span>
              </div>
              <div className="flex gap-5">
                {preview.coverUrl && <img src={preview.coverUrl} alt="cover" className="w-28 h-40 rounded-xl object-cover flex-shrink-0 border border-border shadow-sm"/>}
                <div className="min-w-0 space-y-2">
                  <h3 className="text-xl font-bold">{preview.title}</h3>
                  <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Tác giả:</span> {preview.author||'Không rõ'}</p>
                  <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Số chương:</span> <span className="text-primary font-semibold">{preview.totalChapters>0?preview.totalChapters:'?'}</span></p>
                  {preview.genres.length>0&&<div className="flex flex-wrap gap-1.5 mt-2">{preview.genres.map(g=><span key={g} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">{g}</span>)}</div>}
                  {preview.description&&<p className="text-sm text-muted-foreground line-clamp-3 mt-2">{preview.description}</p>}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm">
                  <span className="font-medium">Sẽ import:</span> <span className="text-primary font-bold">{Math.max(0,toChapter-fromChapter+1)}</span> chương (ch.{fromChapter} → {toChapter===9999?'hết':toChapter}) · delay {batchDelay}ms
                  {overwrite&&<span className="ml-2 text-amber-600">· ghi đè</span>}
                </div>
                <button onClick={() => setShowChapters(!showChapters)} className="text-xs text-primary flex items-center gap-1">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showChapters?'rotate-180':''}`}/>{showChapters?'Ẩn':'Xem'} {preview.previewChapters.length} chương mẫu
                </button>
              </div>

              {showChapters&&preview.previewChapters.length>0&&(
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/40 text-sm">
                    {preview.previewChapters.map(ch=>(
                      <div key={ch.num} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-12 flex-shrink-0">Ch.{ch.num}</span>
                        <span className="truncate">{ch.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-schedule option */}
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={addScheduleAfter} onChange={e => setAddScheduleAfter(e.target.checked)} className="accent-primary w-4 h-4 rounded"/>
                  <Timer className="w-4 h-4 text-amber-600"/> Bật crawl tự động sau khi hoàn thành
                </label>
                {addScheduleAfter&&(
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">Mỗi</label>
                    <select value={schedInterval} onChange={e => setSchedInterval(Number(e.target.value))} className={inputCls}>
                      <option value={15}>15 phút</option><option value={30}>30 phút</option>
                      <option value={60}>1 giờ</option><option value={120}>2 giờ</option>
                      <option value={360}>6 giờ</option><option value={720}>12 giờ</option>
                      <option value={1440}>24 giờ</option>
                    </select>
                    <span className="text-xs text-muted-foreground">sẽ crawl chương mới tự động</span>
                  </div>
                )}
              </div>

              <button onClick={handleStart} className="flex items-center gap-2 px-7 py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-90 shadow-md text-sm">
                <BookOpen className="w-4 h-4"/> 🚀 Bắt đầu crawl {preview.title}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ Active Job Panel — luôn hiển thị dù đang ở tab nào ═══════════════ */}
      {activeJob&&(
        <div className="p-5 rounded-2xl border border-primary/30 bg-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3"><StatusBadge status={activeJob.status}/><span className="font-semibold">{activeJob.storyTitle??preview?.title??url}</span></div>
            <div className="flex items-center gap-2">
              {(activeJob.status==='running'||activeJob.status==='pending')&&(
                <button
                  onClick={async()=>{
                    const res = await fetch(`/api/admin/crawl/status/${activeJobId}/cancel`, { method: 'POST' })
                    if (res.ok) {
                      setActiveJob(prev => prev ? { ...prev, status: 'cancelled' } : prev)
                      clearInterval(pollRef.current!)
                    } else {
                      const d = await res.json().catch(()=>({}))
                      alert(d.error ?? 'Không thể dừng')
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold transition-colors border border-red-200"
                >
                  <StopCircle className="w-4 h-4"/> 🛑 Dừng crawl
                </button>
              )}
              {(activeJob.status==='completed'||activeJob.status==='failed')&&activeJob.storyId&&(
                <Link href={`/admin/truyen/${activeJob.storyId}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">Xem truyện <ExternalLink className="w-3.5 h-3.5"/></Link>
              )}
            </div>
          </div>
          {activeJob.totalChapters>0&&<ProgressBar imported={activeJob.importedChapters} total={activeJob.totalChapters}/>}
          {activeJob.failedChapters>0&&<p className="text-xs text-destructive">❌ {activeJob.failedChapters} chương thất bại</p>}
          <LogPanel logs={activeJob.logs ?? []} isLive={activeJob.status === 'running'} scrollRef={logsEndRef}/>
          {activeJob.status==='running'&&<p className="text-xs text-muted-foreground text-center animate-pulse">⏳ Đang crawl — tự động cập nhật sau 2 giây...</p>}
          {activeJob.status==='cancelled'&&<p className="text-xs text-amber-600 text-center">🛑 Đã dừng — những chương đã crawl được đã được lưu vào DB</p>}
          {activeJob.status==='completed'&&addScheduleAfter&&preview&&activeJob.storyId&&(
            <button onClick={async()=>{
              await fetch('/api/admin/crawl/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storyId:activeJob.storyId,sourceUrl:url,intervalMinutes:schedInterval})})
              alert(`✅ Đã bật auto-crawl mỗi ${schedInterval} phút cho ${preview.title}`)
            }} className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600">
              <Timer className="w-4 h-4 inline mr-1"/>Bật auto-crawl mỗi {schedInterval} phút
            </button>
          )}
        </div>
      )}

      {/* ── Tab: Lịch sử ──────────────────────────────────────────────────────────── */}
      {tab==='history'&&(
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Globe className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>Chưa có lịch sử crawl nào</p></div>
          ) : jobs.map(job => (
            <CrawlJobCard
              key={job.id}
              job={job}
              expanded={expandedJobId === job.id}
              expandedLogs={expandedJobId === job.id ? expandedLogs : []}
              onExpand={() => expandJob(job.id)}
              onDelete={() => deleteJob(job.id)}
              onCancel={async () => {
                const res = await fetch(`/api/admin/crawl/status/${job.id}/cancel`, { method: 'POST' })
                if (res.ok) {
                  setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'cancelled' } : j))
                } else {
                  const d = await res.json().catch(() => ({}))
                  alert(d.error ?? 'Không thể dừng job')
                }
              }}
            />
          ))}
        </div>
      )}

      {/* ── Tab: Lịch sử DB (CrawlLog) ──────────────────────────────────────────── */}
      {tab === 'db-logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Lịch sử crawl được lưu trong DB — không mất khi restart server.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tổng: <strong>{dbLogsTotal}</strong> bản ghi</p>
            </div>
            <button onClick={() => fetchDbLogs(dbLogsPage)} className="p-2 rounded-lg hover:bg-muted">
              <RefreshCw className="w-4 h-4"/>
            </button>
          </div>

          {dbLogsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground"/></div>
          ) : dbLogs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p>Chưa có lịch sử crawl nào trong DB</p>
              <p className="text-xs mt-1">Lịch sử sẽ được ghi lại sau khi crawler chạy lần đầu</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dbLogs.map(log => {
                const statusCfg: Record<string, { cls: string; label: string }> = {
                  running: { cls: 'bg-blue-100 text-blue-700', label: '⏳ Đang chạy' },
                  success: { cls: 'bg-green-100 text-green-700', label: '✅ Thành công' },
                  no_new:  { cls: 'bg-muted text-muted-foreground', label: '⏭️ Không có chương mới' },
                  error:   { cls: 'bg-red-100 text-red-700', label: '❌ Lỗi' },
                }
                const sc = statusCfg[log.status] ?? statusCfg.error
                const duration = log.finishedAt
                  ? Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
                  : null
                return (
                  <div key={log.id} className="p-4 rounded-2xl border border-border bg-card">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                            {sc.label}
                          </span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {log.triggeredBy === 'auto' ? '🤖 Tự động' : '👤 Thủ công'}
                          </span>
                          {duration !== null && (
                            <span className="text-xs text-muted-foreground">{duration}s</span>
                          )}
                        </div>
                        <p className="font-semibold truncate">{log.storyTitle ?? '—'}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{log.sourceUrl}</p>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span>📅 {new Date(log.startedAt).toLocaleString('vi-VN')}</span>
                          {log.chaptersImported > 0 && (
                            <span className="text-green-600 font-medium">+{log.chaptersImported} chương</span>
                          )}
                          {log.chaptersTotal > 0 && log.chaptersImported < log.chaptersTotal && (
                            <span>({log.chaptersImported}/{log.chaptersTotal})</span>
                          )}
                          {log.errorMessage && (
                            <span className="text-destructive">⚠️ {log.errorMessage.slice(0, 80)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {log.storyId && (
                          <Link href={`/admin/truyen/${log.storyId}`} className="p-2 rounded-lg hover:bg-muted" title="Xem truyện">
                            <ExternalLink className="w-4 h-4"/>
                          </Link>
                        )}
                        <button onClick={() => deleteDbLog(log.id)} className="p-2 rounded-lg hover:bg-red-50 text-destructive">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Pagination */}
              {dbLogsTotal > 30 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => fetchDbLogs(dbLogsPage - 1)}
                    disabled={dbLogsPage <= 1 || dbLogsLoading}
                    className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-40"
                  >← Trước</button>
                  <span className="text-sm text-muted-foreground">Trang {dbLogsPage} / {Math.ceil(dbLogsTotal / 30)}</span>
                  <button
                    onClick={() => fetchDbLogs(dbLogsPage + 1)}
                    disabled={dbLogsPage >= Math.ceil(dbLogsTotal / 30) || dbLogsLoading}
                    className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted disabled:opacity-40"
                  >Tiếp →</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Lịch tự động ─────────────────────────────────────────────────────── */}
      {tab==='schedule'&&(
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {schedulerRunning === null ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin"/>Kiểm tra scheduler...</span>
              ) : schedulerRunning ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium border border-green-500/20">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"/>⚙️ Built-in scheduler đang chạy (kiểm tra mỗi 1 phút)
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium border border-amber-500/20">
                  ⚠️ Scheduler chưa khởi động — restart server để bật
                </span>
              )}
            </div>
            <button onClick={fetchSchedules} className="p-2 rounded-lg hover:bg-muted"><RefreshCw className="w-4 h-4"/></button>
          </div>

          {schedulesLoading?<div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground"/></div>
          :schedules.length===0?<div className="py-16 text-center text-muted-foreground"><CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>Chưa có lịch crawl nào. Crawl truyện và bật "crawl tự động" để thêm.</p></div>
          :(
            <div className="space-y-3">
              {schedules.map(s=>(
                <div key={s.id} className={`p-4 rounded-2xl border ${s.isActive?'border-border':'border-border/50 opacity-60'} bg-card`}>
                  <div className="flex items-center gap-4 flex-wrap">
                    {s.story.coverUrl?<img src={s.story.coverUrl} alt={s.story.title} className="w-10 h-14 rounded-lg object-cover flex-shrink-0"/>:<div className="w-10 h-14 rounded-lg bg-muted flex-shrink-0"/>}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold line-clamp-1">{s.story.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.sourceUrl}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Timer className="w-3 h-3"/> Mỗi {s.intervalMinutes} phút</span>
                        <span>Chương cuối: <strong>{s.lastChapterNum||'chưa có'}</strong></span>
                        {s.lastRunAt&&<span>Lần cuối: {new Date(s.lastRunAt).toLocaleString('vi-VN')}</span>}
                        {s.nextRunAt&&s.isActive&&<span>Lần tới: {new Date(s.nextRunAt).toLocaleString('vi-VN')}</span>}
                        {s.lastError&&<span className="text-destructive">⚠️ {s.lastError.slice(0,60)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Change interval */}
                      <select value={s.intervalMinutes} onChange={e=>changeInterval(s.id,Number(e.target.value))}
                        className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background">
                        <option value={15}>15p</option><option value={30}>30p</option><option value={60}>1h</option>
                        <option value={120}>2h</option><option value={360}>6h</option><option value={1440}>24h</option>
                      </select>
                      {/* Trigger now */}
                      <button onClick={()=>triggerNow(s.id)} disabled={runningSchedule===s.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                        {runningSchedule===s.id?<Loader2 className="w-3 h-3 animate-spin"/>:<Play className="w-3 h-3"/>}Chạy ngay
                      </button>
                      {/* Toggle active */}
                      <button onClick={()=>toggleSchedule(s.id,!s.isActive)} className="p-1.5 rounded-lg hover:bg-muted">
                        {s.isActive?<ToggleRight className="w-5 h-5 text-green-500"/>:<ToggleLeft className="w-5 h-5 text-muted-foreground"/>}
                      </button>
                      <button onClick={()=>deleteSchedule(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-destructive"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Cấu hình site ───────────────────────────────────────────────────── */}
      {tab==='sites'&&(
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Cấu hình CSS selector cho từng website. Adapter sẽ sử dụng các selector này nếu domain khớp.</p>
            <button onClick={()=>setEditingConfig({domain:'',name:'',isActive:true})}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90">
              <PlusCircle className="w-4 h-4"/> Thêm site
            </button>
          </div>

          {/* Edit form */}
          {editingConfig&&(
            <div className="p-5 rounded-2xl border border-primary/30 bg-card space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="font-bold">{editingConfig.id?'Sửa cấu hình':'Thêm cấu hình mới'}</h3>
              </div>

              {/* Step 1: Domain + Auto-detect */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bước 1 — Nhập domain hoặc URL trang truyện</p>
                <div className="flex gap-3 flex-wrap">
                  <input value={editingConfig.domain??''} onChange={e=>setEditingConfig(p=>({...p!,domain:e.target.value}))}
                    placeholder="truyenfull.vision hoặc https://truyenfull.vision/ten-truyen/"
                    className={inputCls+' flex-1 min-w-0'} />
                  <button onClick={autoDetect} disabled={autoDetecting||!editingConfig.domain}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 whitespace-nowrap shadow-sm">
                    {autoDetecting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                    {autoDetecting ? 'Đang phát hiện...' : '✨ Tự động phát hiện'}
                  </button>
                </div>
                {detectError&&<p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/>{detectError}</p>}
                {detectPreview&&(
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-green-600">✅ Đã phát hiện — kiểm tra kết quả bên dưới và chỉnh sửa nếu cần:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['Tiêu đề',detectPreview.title],['Tác giả',detectPreview.author],
                        ['Thể loại',detectPreview.genres],['Chương',detectPreview.chapterCount],
                      ].map(([label,val])=>(
                        <div key={label} className={`text-xs px-2.5 py-1 rounded-lg ${val?'bg-green-500/10 text-green-700 dark:text-green-400':'bg-muted text-muted-foreground'}`}>
                          <span className="font-medium">{label}:</span> {val||'❌ Không tìm thấy'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Name + Selectors */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bước 2 — Kiểm tra và chỉnh sửa selectors</p>
              <div>
                <label className={labelCls}>Tên hiển thị <span className="text-destructive">*</span></label>
                <input value={editingConfig.name??''} onChange={e=>setEditingConfig(p=>({...p!,name:e.target.value}))}
                  placeholder="TruyenFull" className={inputCls+' w-full'}/>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {([
                  ['titleSelector','Tiêu đề truyện'],
                  ['authorSelector','Tác giả'],
                  ['coverSelector','Ảnh bìa (attr: src)'],
                  ['descSelector','Mô tả'],
                  ['genreSelector','Thể loại'],
                  ['chapterListSel','Danh sách chương'],
                  ['chapterContentSel','Nội dung chương'],
                  ['chapterTitleSel','Tiêu đề chương'],
                  ['nextPageSel','Nút trang kế'],
                ] as [string,string][]).map(([key,label])=>{
                  const val = (editingConfig as any)[key]
                  return (
                    <div key={key}>
                      <label className={labelCls}>
                        {val ? <span className="text-green-600">✅ </span> : <span className="text-muted-foreground">⬜ </span>}
                        {label}
                      </label>
                      <input value={val??''} onChange={e=>setEditingConfig(p=>({...p!,[key]:e.target.value||undefined}))}
                        placeholder="CSS selector..." className={`${inputCls} w-full font-mono text-xs ${val?'border-green-500/50':''}`}/>
                    </div>
                  )
                })}
              </div>

              {/* Chapter list API section */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-50/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-600">⚡ API Phân trang chương (AJAX)</span>
                  <span className="text-xs text-muted-foreground">— dùng khi danh sách chương tải AJAX theo trang</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>
                      {editingConfig.chapterApiUrl ? <span className="text-green-600">✅ </span> : <span className="text-muted-foreground">⬜ </span>}
                      URL API (dùng <code className="text-amber-500">{'{storyId}'}</code> và <code className="text-amber-500">{'{page}'}</code>)
                    </label>
                    <input value={editingConfig.chapterApiUrl??''}
                      onChange={e=>setEditingConfig(p=>({...p!,chapterApiUrl:e.target.value||undefined}))}
                      placeholder="/get/listchap/{storyId}?page={page}"
                      className={`${inputCls} w-full font-mono text-xs ${editingConfig.chapterApiUrl?'border-green-500/50':'border-amber-500/30'}`}/>
                  </div>
                  <div>
                    <label className={labelCls}>
                      {editingConfig.storyIdPattern ? <span className="text-green-600">✅ </span> : <span className="text-muted-foreground">⬜ </span>}
                      Regex trích storyId (group 1)
                    </label>
                    <input value={editingConfig.storyIdPattern??''}
                      onChange={e=>setEditingConfig(p=>({...p!,storyIdPattern:e.target.value||undefined}))}
                      placeholder={`page\\((\\d+)`}
                      className={`${inputCls} w-full font-mono text-xs ${editingConfig.storyIdPattern?'border-green-500/50':''}`}/>
                  </div>
                  <div>
                    <label className={labelCls}>
                      {editingConfig.chapterApiJson ? <span className="text-green-600">✅ </span> : <span className="text-muted-foreground">⬜ </span>}
                      Trường JSON chứa HTML (mặc định: <code>data</code>)
                    </label>
                    <input value={editingConfig.chapterApiJson??''}
                      onChange={e=>setEditingConfig(p=>({...p!,chapterApiJson:e.target.value||undefined}))}
                      placeholder="data"
                      className={`${inputCls} w-full font-mono text-xs ${editingConfig.chapterApiJson?'border-green-500/50':''}`}/>
                  </div>
                </div>
              </div>

              {/* Cloudflare / Cookie bypass section */}
              <div className="rounded-xl border border-orange-500/20 bg-orange-50/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-orange-600">🍪 Bypass Cloudflare (Cookie)</span>
                  {editingConfig.cookies && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Đã cấu hình</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Nếu site dùng Cloudflare JS Challenge: mở site trong trình duyệt, F12 → Network → copy header{' '}
                  <code className="bg-muted px-1 rounded">Cookie</code> (có chứa{' '}
                  <code className="bg-muted px-1 rounded">cf_clearance=...</code>) → dán vào đây.
                </p>
                <textarea
                  value={editingConfig.cookies??''}
                  onChange={e=>setEditingConfig(p=>({...p!,cookies:e.target.value||undefined}))}
                  rows={3}
                  placeholder="cf_clearance=abc123...; _ga=GA1.2.xxx"
                  className={`${inputCls} w-full resize-none font-mono text-xs ${editingConfig.cookies?'border-green-500/50':'border-orange-500/30'}`}
                />
              </div>

              <div><label className={labelCls}>Ghi chú</label>
                <textarea value={editingConfig.notes??''} onChange={e=>setEditingConfig(p=>({...p!,notes:e.target.value||undefined}))} rows={2} className={inputCls+' w-full resize-none'}/></div>
              <div className="space-y-3">
                {saveError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0"/>{saveError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={()=>{setEditingConfig(null);setDetectPreview(null);setDetectError('');setSaveError('')}} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
                  <button onClick={saveConfig} disabled={savingConfig}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                    {savingConfig?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}
                    {savingConfig ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                </div>
              </div>
            </div>
          )}


          {siteLoading?<div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground"/></div>
          :siteConfigs.length===0&&!editingConfig?<div className="py-16 text-center text-muted-foreground"><Wrench className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>Chưa có cấu hình site nào</p></div>
          :(
            <div className="space-y-3">
              {siteConfigs.map(cfg=>(
                <div key={cfg.id} className="p-4 rounded-2xl border border-border bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">{cfg.name} <span className="text-xs font-normal text-muted-foreground">({cfg.domain})</span></p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          ['Tiêu đề',cfg.titleSelector],['Tác giả',cfg.authorSelector],['Ảnh bìa',cfg.coverSelector],
                          ['Thể loại',cfg.genreSelector],['Nội dung',cfg.chapterContentSel],['Danh sách ch.',cfg.chapterListSel],
                        ].filter(([,v])=>v).map(([label,val])=>(
                          <span key={label} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            <span className="text-muted-foreground">{label}:</span> {val}
                          </span>
                        ))}
                      </div>
                      {cfg.notes&&<p className="text-xs text-muted-foreground mt-1">{cfg.notes}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={()=>setEditingConfig(cfg)} className="p-2 rounded-lg hover:bg-muted text-sm">✏️</button>
                      <button onClick={()=>deleteSiteConfig(cfg.id)} className="p-2 rounded-lg hover:bg-red-50 text-destructive"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Batch Crawl ────────────────────────────────────────────────────── */}
      {tab === 'batch' && (
        <div className="space-y-5">
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">URL trang thể loại / danh sách truyện</label>
              <div className="flex gap-3">
                <input value={batchCategoryUrl} onChange={e=>setBatchCategoryUrl(e.target.value)}
                  placeholder="https://metruyenchu.com.vn/the-loai/tien-hiep"
                  className={`flex-1 ${inputCls}`} disabled={batchFetching||batchRunning}/>
                <button onClick={async()=>{
                  setBatchFetching(true);setBatchStories([]);setBatchError('');setBatchLogs([]);setBatchStoryStatus({});setBatchErrorCount(0)
                  try {
                    const res=await fetch('/api/admin/crawl/list-category',{
                      method:'POST',headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({categoryUrl:batchCategoryUrl,maxPages:batchMaxPages,maxStories:batchMaxStories})
                    })
                    const data=await res.json()
                    if(!res.ok) setBatchError(data.error||'Lỗi không xác định')
                    else { setBatchStories(data.storyUrls||[]); setBatchTotal(data.total) }
                  } catch(e:any){setBatchError(e.message)} finally{setBatchFetching(false)}
                }} disabled={!batchCategoryUrl||batchFetching||batchRunning}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {batchFetching?<Loader2 className="w-4 h-4 animate-spin"/>:<Globe className="w-4 h-4"/>}
                  {batchFetching?'Đang quét...':'Quét danh sách'}
                </button>
              </div>
            </div>

            {/* Config grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div><label className={labelCls}>Số trang quét</label>
                <input type="number" value={batchMaxPages} onChange={e=>setBatchMaxPages(+e.target.value)} min={1} max={20} className={inputCls+' w-full'} disabled={batchRunning}/></div>
              <div><label className={labelCls}>Tối đa truyện</label>
                <input type="number" value={batchMaxStories} onChange={e=>setBatchMaxStories(+e.target.value)} min={1} max={500} className={inputCls+' w-full'} disabled={batchRunning}/></div>
              <div><label className={labelCls}>Từ chương</label>
                <input type="number" value={batchFromChapter} onChange={e=>setBatchFromChapter(+e.target.value)} min={1} className={inputCls+' w-full'} disabled={batchRunning}/></div>
              <div>
                <label className={labelCls}>Truyện song song</label>
                <select value={batchParallelStories} onChange={e=>setBatchParallelStories(+e.target.value)} className={inputCls+' w-full'} disabled={batchRunning}>
                  <option value={1}>1 (an toàn)</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={15}>15 (VPS mạnh)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Chương song song</label>
                <select value={batchChapterConcurrency} onChange={e=>setBatchChapterConcurrency(+e.target.value)} className={inputCls+' w-full'} disabled={batchRunning}>
                  <option value={3}>3</option>
                  <option value={5}>5 (mặc định)</option>
                  <option value={8}>8</option>
                  <option value={10}>10 (nhanh nhất)</option>
                </select>
              </div>
              <div><label className={labelCls}>Delay giữa truyện (s)</label>
                <input type="number" value={batchDelaySec} onChange={e=>setBatchDelaySec(+e.target.value)} min={1} max={60} className={inputCls+' w-full'} disabled={batchRunning}/></div>
            </div>

            {/* Tip */}
            <div className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/30 flex items-center gap-2">
              <span>💡</span>
              <span>Site có Cloudflare: dùng <strong>1 truyện song song</strong> + <strong>3 chương song song</strong>. Site thông thường: 2 truyện + 5 chương.</span>
            </div>
            {batchError&&<div className="text-sm text-destructive p-3 rounded-xl bg-destructive/10 border border-destructive/30">{batchError}</div>}
          </div>

          {batchStories.length>0&&(
            <div className="space-y-4">
              {/* Header row */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">Tìm thấy <span className="text-primary">{batchStories.length}</span> truyện</span>
                  {batchRunning&&<span className="text-xs text-muted-foreground">({batchParallelStories} truyện song song · {batchChapterConcurrency} chương/truyện)</span>}
                  {batchErrorCount>0&&(
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                      <XCircle className="w-3 h-3"/>{batchErrorCount} lỗi
                    </span>
                  )}
                </div>
                <button onClick={async()=>{
                  setBatchRunning(true);setBatchDone(0);setBatchLogs([`🚀 Bắt đầu batch crawl ${batchStories.length} truyện | ${batchParallelStories} song song | ${batchChapterConcurrency} chương/truyện`])
                  setBatchErrorCount(0);setBatchStoryStatus({});batchStopRef.current=false
                  let localDone = 0 // local counter — avoids stale React state closure

                  // Helper: crawl 1 story and wait for completion
                  async function crawlOneStory(storyUrl: string, idx: number) {
                    const slug = storyUrl.split('/').pop() || storyUrl
                    setBatchStoryStatus(p=>({...p,[idx]:'running'}))
                    setBatchLogs(p=>[...p,`[${idx+1}/${batchStories.length}] 🔄 ${slug}`])
                    try {
                      const res=await fetch('/api/admin/crawl/start',{
                        method:'POST',headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({url:storyUrl,fromChapter:batchFromChapter,toChapter:9999,batchDelay:400,overwrite:false,concurrency:batchChapterConcurrency})
                      })
                      if(!res.ok){throw new Error(`HTTP ${res.status}`)}
                      const {jobId}=await res.json()
                      let done=false,attempts=0
                      while(!done&&attempts<600){
                        await new Promise(r=>setTimeout(r,3000))
                        let st: Response
                        try{st=await fetch(`/api/admin/crawl/status/${jobId}`)}catch{attempts++;continue}
                        if(st.status===404){setBatchLogs(p=>[...p,`  ✅ ${slug}: hoàn thành`]);done=true;break}
                        if(st.ok){
                          const d=await st.json()
                          if(d.status==='completed'||d.status==='failed'){
                            const chCount=(d.importedChapters||0)
                            const failCount=Array.isArray(d.failedChapters)?d.failedChapters.length:0
                            const line=failCount>0
                              ?`  ⚠️ ${slug}: ${chCount} ch. | ❌ ${failCount} lỗi`
                              :`  ✅ ${slug}: ${chCount} ch.`
                            setBatchLogs(p=>[...p,line])
                            if(failCount>0){setBatchErrorCount(n=>n+failCount)}
                            else { removeFromFailedQueue(storyUrl) } // success — remove from saved error list
                            done=true
                          }
                        }
                        attempts++
                      }
                      if(!done){ setBatchLogs(p=>[...p,`  ⏳ ${slug}: timeout 30 phút`]); addToFailedQueue(storyUrl) }
                      setBatchStoryStatus(p=>({...p,[idx]:'done'}))
                    }catch(e:any){
                      setBatchLogs(p=>[...p,`  ❌ ${slug}: ${e.message}`])
                      setBatchStoryStatus(p=>({...p,[idx]:'failed'}))
                      setBatchErrorCount(n=>n+1)
                      addToFailedQueue(storyUrl) // persist to localStorage for later retry
                    }
                    localDone++; setBatchDone(p=>p+1)
                  }

                  // Sliding window — ngay khi 1 truyện xong, bắt đầu truyện tiếp theo
                  // (không đợi cả chunk xong mới chạy tiếp như Promise.allSettled chunk)
                  let qIdx = 0
                  const workers: Promise<void>[] = []

                  async function runWorker() {
                    while (qIdx < batchStories.length) {
                      if (batchStopRef.current) break
                      const i = qIdx++
                      await crawlOneStory(batchStories[i], i)
                      if (!batchStopRef.current && batchDelaySec > 0 && qIdx < batchStories.length)
                        await new Promise(r => setTimeout(r, batchDelaySec * 1000))
                    }
                  }

                  for (let w = 0; w < batchParallelStories; w++) workers.push(runWorker())
                  await Promise.allSettled(workers)

                  setBatchLogs(p=>[...p,`🎉 Xong! ${localDone}/${batchStories.length} truyện đã xử lý`])
                  setBatchRunning(false)
                  fetchHistory()
                }} disabled={batchRunning}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                  {batchRunning?<Loader2 className="w-4 h-4 animate-spin"/>:<Globe className="w-4 h-4"/>}
                  {batchRunning?`Đang crawl ${batchDone}/${batchStories.length}...`:`Bắt đầu crawl ${batchStories.length} truyện`}
                </button>
                {batchRunning&&(
                  <button
                    onClick={()=>{
                      batchStopRef.current=true
                      setBatchLogs(p=>[...p,'⏳ Đang dừng sau truyện hiện tại...'])
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold border border-red-200 transition-colors">
                    <StopCircle className="w-4 h-4"/> 🛑 Dừng batch
                  </button>
                )}
                {/* Retry failed stories button — shown when batch not running and has failures */}
                {!batchRunning && batchDone > 0 && Object.values(batchStoryStatus).some(s => s === 'failed') && (
                  <button onClick={async () => {
                    // Collect failed story URLs
                    const failedUrls = batchStories.filter((_, i) => batchStoryStatus[i] === 'failed')
                    if (!failedUrls.length) return
                    setBatchStories(failedUrls)
                    setBatchTotal(failedUrls.length)
                    setBatchRunning(true); setBatchDone(0)
                    setBatchLogs([`🔁 Crawl lại ${failedUrls.length} truyện bị lỗi | ${batchParallelStories} song song`])
                    setBatchErrorCount(0); setBatchStoryStatus({}); batchStopRef.current = false

                    async function crawlOneRetry(storyUrl: string, idx: number) {
                      const slug = storyUrl.split('/').pop() || storyUrl
                      setBatchStoryStatus(p => ({ ...p, [idx]: 'running' }))
                      setBatchLogs(p => [...p, `[${idx + 1}/${failedUrls.length}] 🔄 ${slug}`])
                      try {
                        const res = await fetch('/api/admin/crawl/start', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ url: storyUrl, fromChapter: batchFromChapter, toChapter: 9999, batchDelay: 400, overwrite: false, concurrency: batchChapterConcurrency })
                        })
                        if (!res.ok) throw new Error(`HTTP ${res.status}`)
                        const { jobId } = await res.json()
                        let done = false, attempts = 0
                        while (!done && attempts < 600) {
                          await new Promise(r => setTimeout(r, 3000))
                          let st: Response
                          try { st = await fetch(`/api/admin/crawl/status/${jobId}`) } catch { attempts++; continue }
                          if (st.status === 404) { setBatchLogs(p => [...p, `  ✅ ${slug}: hoàn thành`]); done = true; break }
                          if (st.ok) {
                            const d = await st.json()
                            if (d.status === 'completed' || d.status === 'failed') {
                              const chCount = d.importedChapters || 0
                              const failCount = Array.isArray(d.failedChapters) ? d.failedChapters.length : 0
                              setBatchLogs(p => [...p, failCount > 0 ? `  ⚠️ ${slug}: ${chCount} ch. | ❌ ${failCount} lỗi` : `  ✅ ${slug}: ${chCount} ch.`])
                              if (failCount > 0) setBatchErrorCount(n => n + failCount)
                              done = true
                            }
                          }
                          attempts++
                        }
                        if (!done) setBatchLogs(p => [...p, `  ⏳ ${slug}: timeout`])
                        setBatchStoryStatus(p => ({ ...p, [idx]: 'done' }))
                      } catch (e: any) {
                        setBatchLogs(p => [...p, `  ❌ ${slug}: ${e.message}`])
                        setBatchStoryStatus(p => ({ ...p, [idx]: 'failed' }))
                        setBatchErrorCount(n => n + 1)
                      }
                      setBatchDone(p => p + 1)
                    }

                    let rIdx = 0
                    const rWorkers: Promise<void>[] = []
                    const runRetryWorker = async () => {
                      while (rIdx < failedUrls.length) {
                        if (batchStopRef.current) break
                        const i = rIdx++
                        await crawlOneRetry(failedUrls[i], i)
                        if (!batchStopRef.current && batchDelaySec > 0 && rIdx < failedUrls.length)
                          await new Promise(r => setTimeout(r, batchDelaySec * 1000))
                      }
                    }
                    for (let w = 0; w < batchParallelStories; w++) rWorkers.push(runRetryWorker())
                    await Promise.allSettled(rWorkers)

                    setBatchLogs(p => [...p, `🎉 Xong retry! ${batchDone}/${failedUrls.length} truyện`])
                    setBatchRunning(false); fetchHistory()
                  }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-semibold border border-amber-200 transition-colors">
                    <RefreshCw className="w-4 h-4"/>
                    🔁 Crawl lại {Object.values(batchStoryStatus).filter(s => s === 'failed').length} truyện lỗi
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {(batchRunning||batchDone>0)&&(
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{batchDone}/{batchStories.length} truyện</span>
                    <span>{batchStories.length?Math.round(batchDone/batchStories.length*100):0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full gradient-primary transition-all duration-500"
                      style={{width:`${batchStories.length?Math.round(batchDone/batchStories.length*100):0}%`}}/>
                  </div>
                </div>
              )}

              {/* Colored log */}
              {batchLogs.length>0&&(
                <div className="bg-zinc-950 rounded-xl p-3 font-mono text-xs max-h-56 overflow-y-auto space-y-0.5 border border-border">
                  {batchLogs.map((l,i)=>{
                    const cls=l.includes('❌')||l.includes('FATAL')?'text-red-400'
                      :l.includes('⚠️')?'text-amber-400'
                      :l.includes('↩️')||l.includes('retry')?'text-orange-400'
                      :l.includes('✅')||l.includes('🎉')?'text-green-400'
                      :l.includes('🔄')?'text-blue-400'
                      :l.startsWith('🚀')?'text-purple-400'
                      :'text-zinc-400'
                    return <div key={i} className={cls}>{l}</div>
                  })}
                </div>
              )}

              {/* Story list with status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
                {batchStories.map((url,i)=>{
                  const st=batchStoryStatus[i]
                  return(
                    <div key={url} className={`flex items-center gap-2 text-xs p-2 rounded-lg transition-colors ${
                      st==='running'?'bg-blue-500/10 border border-blue-500/20'
                      :st==='done'?'bg-green-500/10'
                      :st==='failed'?'bg-red-500/10'
                      :'bg-muted/30'
                    }`}>
                      <span className="text-muted-foreground w-6 text-right flex-shrink-0">{i+1}.</span>
                      <span className="font-mono truncate">{url.split('/').pop()}</span>
                      <span className="ml-auto flex-shrink-0">
                        {st==='running'&&<Loader2 className="w-3 h-3 text-blue-500 animate-spin"/>}
                        {st==='done'&&<CheckCircle2 className="w-3 h-3 text-green-500"/>}
                        {st==='failed'&&<XCircle className="w-3 h-3 text-red-500"/>}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Proxy & Bypass ────────────────────────────────────────────────── */}
      {tab === 'proxy' && (
        <div className="space-y-5 max-w-2xl">
          {proxyLoading ? (
            <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="animate-spin w-5 h-5" /> Đang tải...</div>
          ) : (
            <>
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold flex items-center gap-2"><Wifi className="w-4 h-4 text-blue-500" /> Proxy Pool</h2>
                    <p className="text-xs text-muted-foreground mt-1">Mỗi dòng 1 proxy URL. Crawler sẽ phân phối đều qua tất cả proxy (round-robin).</p>
                  </div>
                  {proxyList.split('\n').filter(s => s.trim().startsWith('http')).length > 0 && (
                    <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-semibold">
                      {proxyList.split('\n').filter(s => s.trim().startsWith('http')).length} proxy
                    </span>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Danh sách proxy (mỗi dòng 1 URL)</label>
                  <textarea
                    value={proxyList}
                    onChange={e => setProxyList(e.target.value)}
                    rows={6}
                    placeholder={"http://user:pass@proxy1.host:10000\nhttp://user:pass@proxy2.host:10000\nhttp://user:pass@proxy3.host:10000"}
                    className={inputCls + ' w-full font-mono text-xs resize-y'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Format: <code className="bg-muted px-1 rounded">http://username:password@host:port</code></p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={testProxy} disabled={testingProxy || !proxyList.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50">
                    {testingProxy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                    {testingProxy ? 'Đang test...' : 'Test proxy đầu tiên'}
                  </button>
                  {proxyTestResult && (
                    <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
                      proxyTestResult.ok ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {proxyTestResult.ok
                        ? <><Wifi className="w-4 h-4" /> IP: <strong>{proxyTestResult.ip}</strong></>
                        : <><WifiOff className="w-4 h-4" /> {proxyTestResult.error}</>}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div>
                  <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-purple-500" /> Auto Cloudflare Bypass (Playwright)</h2>
                  <p className="text-xs text-muted-foreground mt-1">Tự động dùng Chromium headless để giải Cloudflare JS challenge khi gặp HTTP 403.</p>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
                  <div>
                    <p className="text-sm font-semibold">🎭 Bật Playwright bypass</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Khi gặp 403, tự động mở Chromium, giải challenge, lấy cookie <code className="bg-muted px-1 rounded">cf_clearance</code>, cache 23 tiếng.</p>
                    <p className="text-xs text-amber-600 mt-1">⚠️ Cần cài trên VPS: <code className="bg-muted px-1 rounded text-xs">npx playwright install chromium && npx playwright install-deps chromium</code></p>
                  </div>
                  <button
                    onClick={() => setUsePlaywright(v => !v)}
                    className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4 ${
                      usePlaywright ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}>
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      usePlaywright ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              <button onClick={saveProxySettings} disabled={proxySaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 disabled:opacity-60 shadow-sm">
                {proxySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : proxySaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {proxySaving ? 'Đang lưu...' : proxySaved ? '✅ Đã lưu!' : 'Lưu cài đặt'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
