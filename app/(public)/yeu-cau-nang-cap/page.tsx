'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BookOpen, Globe2, AlertCircle, CheckCircle2, Clock, Send, Loader2 } from 'lucide-react'

interface RoleRequest { id: string; requestRole: string; status: string; reason: string; adminNote: string | null; createdAt: string }

const ROLE_INFO = {
  AUTHOR: {
    icon: BookOpen, label: 'Tác giả', color: 'from-violet-500 to-purple-600',
    desc: 'Sáng tác truyện gốc, đăng tải và kiếm thu nhập từ bộ truyện của bạn.',
    benefits: ['Đăng truyện gốc', 'Khoá chương bằng xu — nhận 70% hoa hồng', 'Thống kê lượt đọc chi tiết', 'Rút xu thành tiền mặt'],
  },
  TRANSLATOR: {
    icon: Globe2, label: 'Dịch giả', color: 'from-blue-500 to-cyan-500',
    desc: 'Dịch truyện từ ngôn ngữ nước ngoài sang tiếng Việt và chia sẻ với cộng đồng.',
    benefits: ['Đăng bản dịch với link nguồn gốc', 'Khoá chương bằng xu — nhận 70% hoa hồng', 'Thống kê độc giả', 'Rút xu thành tiền mặt'],
  },
}

const STATUS_INFO: Record<string, { label: string; cls: string; icon: any }> = {
  PENDING: { label: 'Đang chờ xét duyệt', cls: 'text-amber-600 bg-amber-50', icon: Clock },
  APPROVED: { label: 'Đã được duyệt', cls: 'text-green-600 bg-green-50', icon: CheckCircle2 },
  REJECTED: { label: 'Bị từ chối', cls: 'text-red-600 bg-red-50', icon: AlertCircle },
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export default function RoleRequestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [requests, setRequests] = useState<RoleRequest[]>([])
  const [selectedRole, setSelectedRole] = useState<'AUTHOR' | 'TRANSLATOR'>('AUTHOR')
  const [reason, setReason] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/dang-nhap'); return }
    if (status === 'authenticated') {
      if (session.user.role === 'AUTHOR') { router.push('/tac-gia'); return }
      if (session.user.role === 'TRANSLATOR') { router.push('/dich-gia'); return }
      if (session.user.role === 'ADMIN') { router.push('/admin'); return }
      fetch('/api/role-requests').then(r => r.json()).then(d => { setRequests(d); setLoading(false) })
    }
  }, [status])

  const hasPending = requests.some(r => r.status === 'PENDING')

  async function submit() {
    setSubmitting(true); setError('')
    const res = await fetch('/api/role-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestRole: selectedRole, reason, portfolio }),
    })
    const d = await res.json()
    if (res.ok) {
      setSuccess(true)
      setRequests(prev => [d.request, ...prev])
      setReason(''); setPortfolio('')
    } else { setError(d.error) }
    setSubmitting(false)
  }

  if (status === 'loading' || loading) return (
    <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-black">Yêu cầu nâng cấp tài khoản</h1>
        <p className="text-muted-foreground mt-1 text-sm">Trở thành tác giả hoặc dịch giả để đăng truyện và kiếm thu nhập.</p>
      </div>

      {/* Role cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {(['AUTHOR', 'TRANSLATOR'] as const).map(role => {
          const info = ROLE_INFO[role]; const Icon = info.icon
          const active = selectedRole === role
          return (
            <button key={role} onClick={() => setSelectedRole(role)}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${info.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold">{info.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{info.desc}</p>
              <ul className="mt-3 space-y-1">
                {info.benefits.map(b => (
                  <li key={b} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Form */}
      {!hasPending && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="font-bold">Điền thông tin</h2>

          {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
          {success && <div className="p-3 rounded-xl bg-green-500/10 text-green-600 text-sm">✅ Yêu cầu đã được gửi! Admin sẽ xét duyệt sớm nhất có thể.</div>}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Lý do muốn trở thành {ROLE_INFO[selectedRole].label} <span className="text-destructive">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              rows={4} maxLength={2000}
              placeholder={`Giới thiệu bản thân, kinh nghiệm, lý do muốn trở thành ${ROLE_INFO[selectedRole].label}... (tối thiểu 50 ký tự)`}
              className={inputCls + ' resize-none'} />
            <p className="text-xs text-muted-foreground mt-1">{reason.length}/2000</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Link portfolio <span className="text-muted-foreground">(không bắt buộc)</span></label>
            <input value={portfolio} onChange={e => setPortfolio(e.target.value)}
              placeholder="https://... (blog, DeviantArt, link bản dịch mẫu...)"
              className={inputCls} />
          </div>

          <button onClick={submit} disabled={submitting || reason.length < 50}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-90 disabled:opacity-60 shadow-md">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </div>
      )}

      {/* History */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold">Lịch sử yêu cầu</h2>
          {requests.map(r => {
            const si = STATUS_INFO[r.status]; const Icon = si.icon
            return (
              <div key={r.id} className="p-4 rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-sm">{ROLE_INFO[r.requestRole as 'AUTHOR' | 'TRANSLATOR']?.label ?? r.requestRole}</span>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${si.cls}`}>
                    <Icon className="w-3 h-3" /> {si.label}
                  </span>
                </div>
                {r.adminNote && (
                  <p className="mt-2 text-xs text-muted-foreground border-l-2 border-muted pl-3">{r.adminNote}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground/60">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
