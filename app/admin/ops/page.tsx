'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Terminal, Play, Loader2, RefreshCw, Trash2, ChevronDown, ChevronUp,
  GitBranch, Hammer, Server, Globe, HardDrive, MemoryStick, AlertTriangle, FileX
} from 'lucide-react'

// ─── Command definitions (mirrors server whitelist) ──────────────────────────
const COMMAND_GROUPS = [
  {
    label: '🚀 Deploy',
    commands: [
      { id: 'git-pull',   label: 'git pull origin main',  icon: GitBranch,    desc: 'Kéo code mới nhất từ GitHub', danger: false },
      { id: 'npm-build',  label: 'npm run build',          icon: Hammer,       desc: 'Build production bundle (~2-5 phút)', danger: false },
      { id: 'clear-next-cache', label: 'Xóa .next/cache', icon: FileX,       desc: 'Xóa cache build để rebuild sạch', danger: true },
    ]
  },
  {
    label: '⚙️ PM2 Process',
    commands: [
      { id: 'pm2-status',  label: 'pm2 status',            icon: Server,       desc: 'Xem trạng thái tất cả processes', danger: false },
      { id: 'pm2-reload',  label: 'pm2 reload truyen-chu', icon: RefreshCw,   desc: 'Reload gracefully (zero downtime)', danger: false },
      { id: 'pm2-restart', label: 'pm2 restart truyen-chu',icon: Server,       desc: 'Restart hoàn toàn (có downtime ~2s)', danger: true },
      { id: 'pm2-logs',    label: 'pm2 logs (80 dòng)',    icon: Terminal,     desc: 'Xem 80 dòng log gần nhất', danger: false },
      { id: 'pm2-logs-error', label: 'pm2 logs --err',     icon: AlertTriangle,desc: 'Xem error logs gần nhất', danger: false },
    ]
  },
  {
    label: '🌐 Nginx',
    commands: [
      { id: 'nginx-test',   label: 'nginx -t',             icon: Globe,        desc: 'Kiểm tra cú pháp nginx config', danger: false },
      { id: 'nginx-reload', label: 'nginx reload',         icon: RefreshCw,   desc: 'Reload nginx config (không downtime)', danger: false },
    ]
  },
  {
    label: '💻 Hệ thống',
    commands: [
      { id: 'disk-usage',  label: 'df -h',                 icon: HardDrive,    desc: 'Xem dung lượng ổ đĩa', danger: false },
      { id: 'mem-usage',   label: 'free -h',               icon: MemoryStick,  desc: 'Xem RAM đang dùng', danger: false },
    ]
  },
]

type LogLine = { type: 'cmd' | 'info' | 'log' | 'err' | 'success'; data: string }

export default function OpsPage() {
  const [running, setRunning] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [currentCmd, setCurrentCmd] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (!collapsed) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, collapsed])

  const runCommand = useCallback(async (cmdId: string, label: string) => {
    if (running) return
    setRunning(cmdId)
    setCurrentCmd(label)
    setLogs([])
    setCollapsed(false)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/admin/ops/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandId: cmdId }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setLogs([{ type: 'err', data: d.error ?? 'Lỗi không xác định' }])
        setRunning(null)
        return
      }

      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          try {
            const json = JSON.parse(line.slice(5).trim())
            if (json.type === 'done') { setRunning(null); return }
            setLogs(prev => [...prev, { type: json.type, data: json.data }])
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setLogs(prev => [...prev, { type: 'err', data: `Kết nối bị ngắt: ${e?.message}` }])
      }
    } finally {
      setRunning(null)
      abortRef.current = null
    }
  }, [running])

  const stopCommand = () => {
    abortRef.current?.abort()
    setLogs(prev => [...prev, { type: 'err', data: '🛑 Đã dừng bởi admin' }])
    setRunning(null)
  }

  const logColor = (type: LogLine['type']) => {
    switch (type) {
      case 'cmd':     return 'text-cyan-400 font-bold'
      case 'info':    return 'text-blue-400'
      case 'err':     return 'text-red-400'
      case 'success': return 'text-green-400 font-semibold'
      default:        return 'text-gray-200'
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary" />
          VPS Operations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chạy lệnh VPS trực tiếp từ trang admin — chỉ các lệnh được whitelist
        </p>
      </div>

      {/* Command Groups */}
      <div className="grid gap-4">
        {COMMAND_GROUPS.map(group => (
          <div key={group.label} className="p-4 rounded-2xl border border-border bg-card">
            <p className="text-sm font-semibold mb-3">{group.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {group.commands.map(cmd => {
                const Icon = cmd.icon
                const isRunning = running === cmd.id
                const isDisabled = !!running && !isRunning
                return (
                  <button
                    key={cmd.id}
                    onClick={() => runCommand(cmd.id, cmd.label)}
                    disabled={isDisabled}
                    className={`
                      flex items-start gap-3 p-3 rounded-xl border text-left transition-all
                      ${isRunning
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : isDisabled
                          ? 'border-border bg-muted/30 opacity-40 cursor-not-allowed'
                          : cmd.danger
                            ? 'border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:bg-red-950/20 dark:hover:bg-red-950/40'
                            : 'border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/30'
                      }
                    `}
                  >
                    <div className={`mt-0.5 flex-shrink-0 ${isRunning ? 'text-primary' : cmd.danger ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {isRunning
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Icon className="w-4 h-4" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-mono font-semibold truncate ${isRunning ? 'text-primary' : cmd.danger ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {cmd.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{cmd.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Output Terminal */}
      {(logs.length > 0 || running) && (
        <div className="rounded-2xl border border-border overflow-hidden shadow-lg">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-700">
            <div className="flex items-center gap-3">
              {/* macOS traffic lights */}
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {running ? `⏳ Running: ${currentCmd}` : `✅ ${currentCmd}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {running && (
                <button
                  onClick={stopCommand}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-900/50 hover:bg-red-800 text-red-300 text-xs font-medium transition-colors"
                >
                  ■ Stop
                </button>
              )}
              <button
                onClick={() => setLogs([])}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Xóa output"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCollapsed(c => !c)}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          {!collapsed && (
            <div className="bg-zinc-950 font-mono text-xs leading-relaxed h-80 overflow-y-auto p-4 space-y-0.5">
              {logs.map((line, i) => (
                <div key={i} className={logColor(line.type)}>
                  {line.type === 'cmd' ? <span className="text-zinc-500 mr-2">$</span> : null}
                  <span className="whitespace-pre-wrap break-all">{line.data}</span>
                </div>
              ))}
              {running && (
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Đang chạy...</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-xs">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Chỉ ADMIN mới truy cập được trang này. Các lệnh được giới hạn trong whitelist an toàn. Không có shell tự do.</span>
      </div>
    </div>
  )
}
