'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Info, AlertCircle, Zap, CheckCircle, Trash2, RefreshCw, Filter, X, ChevronDown, ChevronRight } from 'lucide-react'

interface ErrorLogItem {
  id: string; level: string; message: string; stack?: string
  path?: string; method?: string; userId?: string
  metadata?: any; resolved: boolean; resolvedAt?: string; createdAt: string
}

const LEVEL_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  FATAL: { icon: Zap, color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-950/40' },
  ERROR: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
  WARN:  { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
  INFO:  { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return `${s}s trước`
  if (s < 3600) return `${Math.floor(s/60)}m trước`
  if (s < 86400) return `${Math.floor(s/3600)}h trước`
  return new Date(d).toLocaleDateString('vi-VN')
}

export default function ErrorLogManager() {
  const [logs, setLogs] = useState<ErrorLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any[]>([])
  const [level, setLevel] = useState('all')
  const [resolved, setResolved] = useState('false')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ level, resolved, page: String(page) })
    const res = await fetch(`/api/admin/error-logs?${params}`)
    if (res.ok) { const d = await res.json(); setLogs(d.logs); setTotal(d.total); setStats(d.stats) }
    setLoading(false)
  }, [level, resolved, page])

  useEffect(() => { fetch_() }, [fetch_])

  async function bulkResolve(resolveValue: boolean) {
    const ids = selected.size > 0 ? Array.from(selected) : logs.filter(l => !l.resolved).map(l => l.id)
    await fetch('/api/admin/error-logs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, resolved: resolveValue }) })
    setSelected(new Set()); fetch_()
  }

  async function deleteResolved() {
    if (!confirm('Xoá tất cả log đã xử lý?')) return
    await fetch('/api/admin/error-logs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [] }) })
    fetch_()
  }

  async function deleteSelected() {
    if (!confirm(`Xoá ${selected.size} log?`)) return
    await fetch('/api/admin/error-logs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selected) }) })
    setSelected(new Set()); fetch_()
  }

  function toggleExpand(id: string) { setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleSelect(id: string) { setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  const PER_PAGE = 50

  // Stats mapping
  const statMap: Record<string, number> = {}
  stats.forEach((s: any) => { statMap[s.level] = s._count.id })

  return (
    <div className="space-y-5">
      {/* 24h Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['FATAL','ERROR','WARN','INFO'] as const).map(l => {
          const cfg = LEVEL_CONFIG[l]
          const Icon = cfg.icon
          return (
            <button key={l} onClick={() => { setLevel(l.toLowerCase()); setPage(1) }}
              className={`p-4 rounded-2xl border border-border text-left transition-all hover:shadow-md ${level === l.toLowerCase() ? 'ring-2 ring-primary' : ''}`}>
              <Icon className={`w-5 h-5 ${cfg.color} mb-2`}/>
              <div className="text-2xl font-black">{statMap[l] ?? 0}</div>
              <div className="text-xs text-muted-foreground">{l} (24h)</div>
            </button>
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {[['all','Tất cả'],['error','Error'],['warn','Warn'],['info','Info'],['fatal','Fatal']].map(([v,l]) => (
            <button key={v} onClick={() => { setLevel(v); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${level === v ? 'gradient-primary text-white' : 'border border-border hover:bg-muted'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {[['false','Chưa xử lý'],['true','Đã xử lý'],['','Tất cả']].map(([v,l]) => (
            <button key={v+l} onClick={() => { setResolved(v); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${resolved === v ? 'border-primary border text-primary' : 'border border-border hover:bg-muted'}`}>{l}</button>
          ))}
        </div>
        <button onClick={fetch_} title="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
        </button>
      </div>

      {/* Bulk actions */}
      {(selected.size > 0 || logs.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted/50">
          <span className="text-xs text-muted-foreground">{selected.size > 0 ? `Đã chọn ${selected.size}` : `${total} log`}</span>
          <button onClick={() => bulkResolve(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:opacity-80">
            <CheckCircle className="w-3.5 h-3.5"/>Đánh dấu đã xử lý
          </button>
          {selected.size > 0 && <button onClick={deleteSelected} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-medium hover:opacity-80"><Trash2 className="w-3.5 h-3.5"/>Xoá</button>}
          <button onClick={deleteResolved} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted ml-auto"><Trash2 className="w-3.5 h-3.5"/>Xoá tất cả đã xử lý</button>
        </div>
      )}

      {/* Log list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-60"/><p>Không có lỗi nào{resolved === 'false' ? ' chưa xử lý' : ''}!</p></div>
        ) : (
          <div className="divide-y divide-border/50">
            {logs.map(log => {
              const cfg = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.INFO
              const Icon = cfg.icon
              const isExp = expanded.has(log.id)
              return (
                <div key={log.id} className={`${log.resolved ? 'opacity-60' : ''} ${cfg.bg} px-4 py-3`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selected.has(log.id)} onChange={() => toggleSelect(log.id)} className="mt-1 flex-shrink-0"/>
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{log.level}</span>
                        {log.path && <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.method} {log.path}</code>}
                        <span className="text-xs text-muted-foreground ml-auto">{timeAgo(log.createdAt)}</span>
                        {log.resolved && <span className="text-xs text-green-600 font-medium">✓ Đã xử lý</span>}
                      </div>
                      <p className="text-sm font-medium mt-1 line-clamp-2">{log.message}</p>
                      {log.stack && (
                        <button onClick={() => toggleExpand(log.id)} className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                          {isExp ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                          {isExp ? 'Ẩn' : 'Xem'} stack trace
                        </button>
                      )}
                      {isExp && log.stack && (
                        <pre className="mt-2 p-3 bg-background rounded-xl text-xs overflow-x-auto border border-border whitespace-pre-wrap break-all">{log.stack}</pre>
                      )}
                      {log.metadata && <pre className="mt-1 text-xs text-muted-foreground">{JSON.stringify(log.metadata, null, 2)}</pre>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && <button onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">← Trước</button>}
          <span className="px-4 py-2 text-sm text-muted-foreground">Trang {page}/{Math.ceil(total / PER_PAGE)}</span>
          {page < Math.ceil(total / PER_PAGE) && <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">Tiếp →</button>}
        </div>
      )}
    </div>
  )
}
