'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function AdminTransactionActions() {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState('')
  const [coinAmount, setCoinAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseInt(coinAmount)
    if (!userId || isNaN(amount) || amount <= 0) { setMessage('Nhập đầy đủ thông tin'); return }
    setLoading(true); setMessage('')
    const res = await fetch('/api/admin/transactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, coinAmount: amount, note }),
    })
    if (res.ok) { setMessage(`✅ Đã tặng ${amount} xu`); setUserId(''); setCoinAmount(''); setNote('') }
    else { const d = await res.json(); setMessage('❌ ' + (d.error || 'Lỗi')) }
    setLoading(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 shadow-sm">
        <Plus className="w-4 h-4" /> Tặng xu thủ công
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl border border-border bg-card shadow-xl z-50 space-y-3">
          <h3 className="font-semibold text-sm">Tặng xu cho user</h3>
          {message && <p className="text-sm">{message}</p>}
          <form onSubmit={handleApprove} className="space-y-3">
            <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="number" value={coinAmount} onChange={e => setCoinAmount(e.target.value)} placeholder="Số xu" min={1}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú (tuỳ chọn)"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
              {loading ? 'Đang xử lý...' : 'Xác nhận tặng xu'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
