'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, MessageSquare } from 'lucide-react'

export default function AdminPaymentActions({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)

  async function handle(action: 'approve' | 'reject') {
    setLoading(action)
    const res = await fetch('/api/admin/payment-requests', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId, action, adminNote }),
    })
    const data = await res.json()
    if (res.ok) { setDone(true); setResult(data.action); router.refresh() }
    setLoading(null)
  }

  if (done) {
    return (
      <span className={`px-3 py-1.5 rounded-xl text-sm font-medium ${
        result === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
        {result === 'approved' ? '✅ Đã duyệt' : '❌ Đã từ chối'}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2">
        <button onClick={() => handle('approve')} disabled={!!loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-60 transition-colors shadow-sm">
          {loading === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Duyệt
        </button>
        <button onClick={() => setShowNote(!showNote)}
          className="p-2 rounded-xl border border-border hover:bg-muted transition-colors" title="Thêm ghi chú">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={() => handle('reject')} disabled={!!loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-destructive text-destructive text-sm font-semibold hover:bg-destructive/10 disabled:opacity-60 transition-colors">
          {loading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          Từ chối
        </button>
      </div>
      {showNote && (
        <input value={adminNote} onChange={e => setAdminNote(e.target.value)}
          placeholder="Ghi chú cho người dùng (tuỳ chọn)..."
          className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
          autoFocus />
      )}
    </div>
  )
}
