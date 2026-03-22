'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, Coins, Building2, Smartphone } from 'lucide-react'

interface WithdrawReq {
  id: string; coins: number; fee: number; netCoins: number; method: string; accountInfo: string; status: string; createdAt: string; adminNote: string | null
  user: { id: string; name: string | null; email: string; coinBalance: number }
}

const TABS = ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED']
const TAB_LABEL: Record<string, string> = { PENDING: 'Chờ', PROCESSING: 'Đang xử lý', COMPLETED: 'Hoàn tất', REJECTED: 'Từ chối' }
const STATUS_CLS: Record<string, string> = {
  PENDING: 'text-amber-600 bg-amber-50', PROCESSING: 'text-blue-600 bg-blue-50',
  COMPLETED: 'text-green-600 bg-green-50', REJECTED: 'text-red-600 bg-red-50',
}

export default function AdminWithdrawRequestsPage() {
  const [tab, setTab] = useState('PENDING')
  const [requests, setRequests] = useState<WithdrawReq[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [noteModal, setNoteModal] = useState<{ id: string; action: 'complete' | 'reject' } | null>(null)
  const [adminNote, setAdminNote] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/withdraw-requests?status=${tab}`)
      .then(r => r.json()).then(d => { setRequests(d.requests ?? []); setLoading(false) })
  }, [tab])

  async function act(id: string, action: string, note = '') {
    setProcessing(id)
    await fetch('/api/admin/withdraw-requests', {
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
      <h1 className="text-2xl font-black flex items-center gap-2"><Coins className="w-7 h-7 text-amber-500" /> Duyệt rút xu</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}>
            {TAB_LABEL[t]}
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
            const info = (() => { try { return JSON.parse(r.accountInfo) } catch { return {} } })()
            return (
              <div key={r.id} className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold">{r.user.name ?? r.user.email}</p>
                    <p className="text-xs text-muted-foreground">{r.user.email} • Số dư: {r.user.coinBalance.toLocaleString()} xu</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLS[r.status]}`}>
                    {TAB_LABEL[r.status]}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Số xu</p>
                    <p className="font-bold">{r.coins.toLocaleString()} xu</p>
                    <p className="text-xs text-muted-foreground">Phí: {r.fee.toLocaleString()} xu → Nhận: <strong>{r.netCoins.toLocaleString()} xu</strong></p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Tài khoản nhận</p>
                    <p className="flex items-center gap-1 font-medium">
                      {r.method === 'bank' ? <Building2 className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                      {r.method === 'bank' ? 'Ngân hàng' : 'MoMo'}
                    </p>
                    {info.bankName && <p className="text-xs text-muted-foreground">{info.bankName}</p>}
                    <p className="text-xs font-mono">{info.accountNumber}</p>
                    <p className="text-xs text-muted-foreground">{info.accountName}</p>
                  </div>
                </div>

                {tab === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => act(r.id, 'processing')} disabled={processing === r.id}
                      className="flex-1 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted disabled:opacity-60">
                      Đang xử lý
                    </button>
                    <button onClick={() => { setNoteModal({ id: r.id, action: 'complete' }); setAdminNote('') }} disabled={processing === r.id}
                      className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-60">
                      Hoàn tất ✅
                    </button>
                    <button onClick={() => { setNoteModal({ id: r.id, action: 'reject' }); setAdminNote('') }} disabled={processing === r.id}
                      className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {tab === 'PROCESSING' && (
                  <div className="flex gap-2">
                    <button onClick={() => { setNoteModal({ id: r.id, action: 'complete' }); setAdminNote('') }}
                      className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600">
                      Hoàn tất ✅
                    </button>
                    <button onClick={() => { setNoteModal({ id: r.id, action: 'reject' }); setAdminNote('') }}
                      className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Action modal */}
      {noteModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setNoteModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="font-bold">{noteModal.action === 'complete' ? '✅ Xác nhận hoàn tất' : '❌ Từ chối yêu cầu'}</h3>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3}
                placeholder={noteModal.action === 'complete' ? 'Ghi chú (không bắt buộc)' : 'Lý do từ chối (xu sẽ được hoàn lại cho user)'}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setNoteModal(null)} className="flex-1 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
                <button onClick={() => act(noteModal.id, noteModal.action, adminNote)}
                  className={`flex-1 py-2 rounded-xl text-white text-sm font-semibold ${noteModal.action === 'complete' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
