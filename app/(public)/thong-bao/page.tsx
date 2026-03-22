'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck, Loader2, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

interface Notification { id: string; type: string; title: string; message: string; link: string | null; isRead: boolean; createdAt: string }

const TYPE_COLOR: Record<string, string> = {
  CHAPTER_APPROVED: 'border-l-green-500',
  CHAPTER_REJECTED: 'border-l-red-500',
  ROLE_APPROVED: 'border-l-purple-500',
  ROLE_REJECTED: 'border-l-orange-500',
  WITHDRAW_COMPLETED: 'border-l-emerald-500',
  WITHDRAW_REJECTED: 'border-l-red-500',
}

const PER_PAGE = 20

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  async function load(currentOffset: number, append = false) {
    if (currentOffset === 0) setLoading(true); else setLoadingMore(true)
    const res = await fetch(`/api/notifications?offset=${currentOffset}&limit=${PER_PAGE}`)
    const d = await res.json()
    const items: Notification[] = d.notifications ?? []
    if (append) setNotifications(prev => [...prev, ...items])
    else setNotifications(items)
    setHasMore(items.length === PER_PAGE)
    setOffset(currentOffset + items.length)
    setLoading(false); setLoadingMore(false)
  }

  useEffect(() => { load(0) }, [])

  async function markAll() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  async function markOne(id: string) {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2"><Bell className="w-7 h-7 text-primary" /> Thông báo</h1>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <CheckCheck className="w-4 h-4" /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center">
          <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="text-muted-foreground">Chưa có thông báo nào</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {notifications.map(n => {
              const borderCls = TYPE_COLOR[n.type] ?? 'border-l-primary'
              const content = (
                <div className={`p-4 rounded-2xl border-l-4 border border-border bg-card ${borderCls} ${!n.isRead ? 'bg-primary/5' : ''} hover:shadow-sm transition-shadow`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                  </p>
                </div>
              )

              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => { if (!n.isRead) markOne(n.id) }}>{content}</Link>
              ) : (
                <div key={n.id} onClick={() => { if (!n.isRead) markOne(n.id) }}>{content}</div>
              )
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => load(offset, true)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                {loadingMore ? 'Đang tải...' : 'Xem thêm thông báo'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
