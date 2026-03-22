'use client'

import { useState } from 'react'
import { SendHorizonal, X, AlertCircle, CheckCircle, Loader2, Hash } from 'lucide-react'

export default function CoinTransferModal({ onClose }: { onClose: () => void }) {
  const [toDisplayId, setToDisplayId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const numId = parseInt(toDisplayId)
    if (!numId || numId <= 0) { setError('Vui lòng nhập số ID hợp lệ'); return }
    if (!amount || isNaN(+amount) || +amount <= 0) { setError('Vui lòng nhập số xu hợp lệ'); return }
    setSending(true); setError(''); setSuccess('')
    const res = await fetch('/api/user/transfer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toDisplayId: numId, amount: parseInt(amount), message })
    })
    const d = await res.json()
    if (res.ok) {
      setSuccess(`✅ Đã gửi ${amount} xu cho ${d.receiverName || 'người dùng'}!`)
      setToDisplayId(''); setAmount(''); setMessage('')
    } else {
      setError(d.error || 'Lỗi gửi xu')
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <SendHorizonal className="w-5 h-5 text-amber-500"/>Chuyển xu
          </h3>
          <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={send} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">ID người nhận (số)</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
              <input type="number" value={toDisplayId} onChange={e => setToDisplayId(e.target.value)}
                min="1" placeholder="Ví dụ: 42"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-mono"/>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Xem ID số tại trang hồ sơ người dùng</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Số xu</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              min="1" placeholder="Ví dụ: 100"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Lời nhắn (tuỳ chọn)</label>
            <input value={message} onChange={e => setMessage(e.target.value)}
              maxLength={200} placeholder="Ví dụ: Chúc mừng!"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"/>
          </div>
          {error && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/>{error}</p>}
          {success && <p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle className="w-4 h-4"/>{success}</p>}
          <p className="text-xs text-muted-foreground">Giới hạn: 5.000 xu/ngày</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-sm">Huỷ</button>
            <button type="submit" disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
              {sending ? <Loader2 className="w-4 h-4 animate-spin"/> : <SendHorizonal className="w-4 h-4"/>}Gửi xu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
