'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { BookMarked, ChevronDown, Check } from 'lucide-react'

const OPTIONS = [
  { value: 'READING', label: '📖 Đang đọc', color: 'text-blue-600' },
  { value: 'PLAN', label: '📋 Đọc sau', color: 'text-muted-foreground' },
  { value: 'DROPPED', label: '❌ Bỏ dở', color: 'text-red-500' },
  { value: 'COMPLETED', label: '✅ Đã đọc xong', color: 'text-green-600' },
]

interface ReadingListButtonProps {
  storyId: string
  initialStatus?: string | null
}

export default function ReadingListButton({ storyId, initialStatus }: ReadingListButtonProps) {
  const { data: session } = useSession()
  const [status, setStatus] = useState<string | null>(initialStatus ?? null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const current = OPTIONS.find(o => o.value === status)

  async function handleSelect(value: string | null) {
    if (!session) { window.location.href = '/dang-nhap'; return }
    setLoading(true); setOpen(false)
    try {
      const res = await fetch('/api/user/reading-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, status: value }),
      })
      const data = await res.json()
      if (res.ok) setStatus(data.status)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${
          status ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border hover:bg-muted'
        }`}
      >
        <BookMarked className="w-4 h-4" />
        {current ? current.label : 'Thêm vào danh sách'}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[180px]">
          {OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => handleSelect(opt.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors text-left ${opt.color}`}>
              {status === opt.value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              {status !== opt.value && <div className="w-3.5" />}
              {opt.label}
            </button>
          ))}
          {status && (
            <button onClick={() => handleSelect(null)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors border-t border-border">
              <div className="w-3.5" /> Xóa khỏi danh sách
            </button>
          )}
        </div>
      )}
    </div>
  )
}
