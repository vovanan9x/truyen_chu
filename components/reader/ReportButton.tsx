'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Flag, X } from 'lucide-react'

const REASONS = [
  { value: 'WRONG_CHAPTER', label: 'Sai chương / nhảy chương' },
  { value: 'MISSING_CONTENT', label: 'Thiếu nội dung' },
  { value: 'DUPLICATE', label: 'Trùng chương' },
  { value: 'WRONG_STORY', label: 'Sai truyện' },
  { value: 'OTHER', label: 'Lý do khác' },
]

export default function ReportButton({ chapterId }: { chapterId: string }) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('WRONG_CHAPTER')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session) { window.location.href = '/dang-nhap'; return }
    setLoading(true)
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, reason, note }),
      })
      setDone(true)
      setTimeout(() => { setDone(false); setOpen(false) }, 2000)
    } catch {}
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
      >
        <Flag className="w-3.5 h-3.5" /> Báo lỗi chương
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Báo lỗi chương</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {done ? (
              <div className="text-center py-8">
                <p className="text-green-600 font-medium">✅ Đã gửi báo lỗi! Cảm ơn bạn.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Lý do báo lỗi</label>
                  <div className="space-y-2">
                    {REASONS.map(r => (
                      <label key={r.value} className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                          onChange={() => setReason(r.value)} className="accent-primary w-4 h-4" />
                        <span className="text-sm group-hover:text-foreground text-foreground/80">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5">Ghi chú thêm (tuỳ chọn)</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
                    placeholder="Mô tả chi tiết lỗi..."
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={loading}
                    className="flex-1 py-2.5 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60">
                    {loading ? 'Đang gửi...' : 'Gửi báo lỗi'}
                  </button>
                  <button type="button" onClick={() => setOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
