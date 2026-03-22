'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, BookOpen, Globe2, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface RoleRequest {
  id: string; requestRole: string; status: string; reason: string; portfolio: string | null; createdAt: string
  user: { id: string; name: string | null; email: string; role: string; createdAt: string }
}

const TABS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']

export default function AdminRoleRequestsPage() {
  const [tab, setTab] = useState('PENDING')
  const [requests, setRequests] = useState<RoleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [noteModal, setNoteModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [adminNote, setAdminNote] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/role-requests?status=${tab}`)
      .then(r => r.json()).then(d => { setRequests(d.requests ?? []); setLoading(false) })
  }, [tab])

  async function act(id: string, action: 'approve' | 'reject', note = '') {
    setProcessing(id)
    await fetch('/api/admin/role-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, adminNote: note }),
    })
    setRequests(prev => prev.filter(r => r.id !== id))
    setNoteModal(null); setAdminNote('')
    setProcessing(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-2xl font-black">Duyệt nâng cấp tài khoản</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}>
            {t === 'PENDING' ? 'Chờ duyệt' : t === 'APPROVED' ? 'Đã duyệt' : t === 'REJECTED' ? 'Từ chối' : 'Tất cả'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">Không có yêu cầu nào</div>
      ) : (
        <div className="space-y-4">
          {requests.map(r => {
            const RoleIcon = r.requestRole === 'AUTHOR' ? BookOpen : Globe2
            return (
              <div key={r.id} className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.requestRole === 'AUTHOR' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'}`}>
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold">{r.user.name ?? r.user.email}</p>
                      <p className="text-xs text-muted-foreground">{r.user.email} • {r.requestRole === 'AUTHOR' ? 'Tác giả' : 'Dịch giả'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>

                <div className="rounded-xl bg-muted/50 p-4 text-sm">
                  <p className="font-medium mb-1 text-xs text-muted-foreground">Lý do</p>
                  <p className="whitespace-pre-wrap">{r.reason}</p>
                  {r.portfolio && (
                    <a href={r.portfolio} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-primary text-xs hover:underline">
                      <ExternalLink className="w-3 h-3" /> Portfolio
                    </a>
                  )}
                </div>

                {r.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => act(r.id, 'approve')} disabled={processing === r.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-60">
                      {processing === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Duyệt
                    </button>
                    <button onClick={() => { setNoteModal({ id: r.id, action: 'reject' }); setAdminNote('') }} disabled={processing === r.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60">
                      <XCircle className="w-4 h-4" /> Từ chối
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject modal */}
      {noteModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setNoteModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="font-bold">Lý do từ chối</h3>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={4}
                placeholder="Nhập lý do từ chối..." className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setNoteModal(null)} className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
                <button onClick={() => act(noteModal.id, noteModal.action, adminNote)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Xác nhận từ chối</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
