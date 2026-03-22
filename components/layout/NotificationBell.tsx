'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface Notification {
  id: string; type: string; title: string; message: string
  link: string | null; isRead: boolean; createdAt: string
}

const TYPE_COLOR: Record<string, string> = {
  CHAPTER_APPROVED: 'bg-green-500',
  CHAPTER_REJECTED: 'bg-red-500',
  ROLE_APPROVED:    'bg-purple-500',
  ROLE_REJECTED:    'bg-orange-500',
  WITHDRAW_COMPLETED: 'bg-emerald-500',
  WITHDRAW_REJECTED:  'bg-red-500',
  NEW_CHAPTER:      'bg-blue-500',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const esRef = useRef<EventSource | null>(null)

  // --- Fetch danh sách thông báo (chỉ gọi khi mở dropdown hoặc cần refresh) ---
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const d = await res.json()
        setNotifications(d.notifications)
        setUnreadCount(d.unreadCount)
      }
    } catch {}
    setLoading(false)
  }, [])

  // --- SSE: nhận push unreadCount realtime thay vì polling 30s ---
  const connectSSE = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const es = new EventSource('/api/notifications/stream')
    esRef.current = es

    es.addEventListener('unread', (e) => {
      const data = JSON.parse(e.data)
      if (data.count === -1) {
        // Scheduler gửi count=-1 → cần fetch count thực từ API nhưng không cần full list
        fetch('/api/notifications?limit=1')
          .then(r => r.json())
          .then(d => setUnreadCount(d.unreadCount))
          .catch(() => {})
      } else {
        setUnreadCount(data.count)
      }
    })

    es.onerror = () => {
      es.close()
      esRef.current = null
      // Exponential backoff: reconnect sau 5s, 10s, 20s... tối đa 60s
      const delay = Math.min(60_000, 5_000 * (1 + Math.random()))
      retryRef.current = setTimeout(connectSSE, delay)
    }
  }, [])

  useEffect(() => {
    // Lấy count ban đầu qua SSE (gửi ngay khi connect)
    connectSSE()

    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [connectSSE])

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Mở dropdown → fetch danh sách đầy đủ
  function handleOpen() {
    const next = !open
    setOpen(next)
    if (next && notifications.length === 0) fetchNotifications()
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-muted transition-colors">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-bold text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5" /> Đánh dấu tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-30 animate-pulse" />
                Đang tải...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.slice(0, 8).map(n => (
                <div key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer ${!n.isRead ? 'bg-primary/5' : ''}`}
                  onClick={() => { if (!n.isRead) markRead(n.id); if (n.link) setOpen(false) }}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? (TYPE_COLOR[n.type] ?? 'bg-primary') : 'bg-muted-foreground/20'}`} />
                  <div className="flex-1 min-w-0">
                    {n.link ? (
                      <Link href={n.link} className="block">
                        <p className={`text-xs font-semibold ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                        </p>
                      </Link>
                    ) : (
                      <>
                        <p className={`text-xs font-semibold ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <Link href="/thong-bao" onClick={() => setOpen(false)}
            className="block text-center py-2.5 text-xs text-primary hover:bg-muted transition-colors font-medium border-t border-border">
            Xem tất cả thông báo →
          </Link>
        </div>
      )}
    </div>
  )
}
