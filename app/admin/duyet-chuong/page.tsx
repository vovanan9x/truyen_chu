'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Eye, BookOpen, Loader2, Lock, Gift } from 'lucide-react'
import Link from 'next/link'

interface Chapter {
  id: string; chapterNum: number; title: string | null; wordCount: number
  isLocked: boolean; coinCost: number; submittedAt: string | null
  story: { id: string; title: string; slug: string; coverUrl: string | null; ownerType: string | null; owner: { name: string | null; email: string } | null }
}

const TABS = ['PENDING', 'APPROVED', 'REJECTED']

export default function AdminChapterReviewPage() {
  const [tab, setTab] = useState('PENDING')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/chapter-review?status=${tab}`)
      .then(r => r.json()).then(d => { setChapters(d.chapters ?? []); setLoading(false) })
  }, [tab])

  async function act(id: string, action: 'approve' | 'reject', reason?: string) {
    setProcessing(id)
    await fetch('/api/admin/chapter-review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, rejectReason: reason }),
    })
    setChapters(prev => prev.filter(c => c.id !== id))
    setRejectModal(null); setRejectReason('')
    setProcessing(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-2xl font-black">Duyệt chương</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}>
            {t === 'PENDING' ? '⏳ Chờ duyệt' : t === 'APPROVED' ? '✅ Đã duyệt' : '❌ Bị từ chối'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : chapters.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">Không có chương nào</div>
      ) : (
        <div className="space-y-4">
          {chapters.map(ch => (
            <div key={ch.id} className="p-5 rounded-2xl border border-border bg-card space-y-4">
              <div className="flex items-start gap-4 flex-wrap">
                {ch.story.coverUrl
                  ? <img src={ch.story.coverUrl} alt={ch.story.title} className="w-12 h-16 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-12 h-16 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center"><BookOpen className="w-5 h-5 text-muted-foreground" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-bold line-clamp-1">{ch.story.title}</p>
                  <p className="text-sm text-muted-foreground">Chương {ch.chapterNum}{ch.title ? ` — ${ch.title}` : ''}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                    <span>{ch.wordCount.toLocaleString()} chữ</span>
                    <span className="flex items-center gap-1">
                      {ch.isLocked ? <><Lock className="w-3 h-3" /> {ch.coinCost} xu</> : <><Gift className="w-3 h-3" /> Miễn phí</>}
                    </span>
                    <span>{ch.story.ownerType === 'AUTHOR' ? '✍️ Tác giả' : '🌐 Dịch giả'}: {ch.story.owner?.name ?? ch.story.owner?.email}</span>
                    {ch.submittedAt && <span>{new Date(ch.submittedAt).toLocaleDateString('vi-VN')}</span>}
                  </div>
                </div>
                <Link href={`/truyen/${ch.story.slug}/chuong/${ch.chapterNum}`} target="_blank"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">
                  <Eye className="w-3.5 h-3.5" /> Xem
                </Link>
              </div>

              {tab === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => act(ch.id, 'approve')} disabled={processing === ch.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-60">
                    {processing === ch.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Duyệt
                  </button>
                  <button onClick={() => { setRejectModal(ch.id); setRejectReason('') }} disabled={processing === ch.id}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60">
                    <XCircle className="w-4 h-4" /> Từ chối
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setRejectModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="font-bold">Lý do từ chối chương</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
                placeholder="Nhập lý do từ chối..." className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
                <button onClick={() => act(rejectModal, 'reject', rejectReason)} disabled={!rejectReason.trim()}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60">Xác nhận</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
