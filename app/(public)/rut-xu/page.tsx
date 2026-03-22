'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Coins, Info, Loader2, AlertCircle, CheckCircle2, Clock, ChevronRight, Building2, Smartphone } from 'lucide-react'

interface WithdrawReq { id: string; coins: number; fee: number; netCoins: number; method: string; status: string; createdAt: string; adminNote: string | null }

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Chờ xử lý', cls: 'text-amber-600 bg-amber-50' },
  PROCESSING: { label: 'Đang xử lý', cls: 'text-blue-600 bg-blue-50' },
  COMPLETED: { label: 'Hoàn tất', cls: 'text-green-600 bg-green-50' },
  REJECTED: { label: 'Bị từ chối', cls: 'text-red-600 bg-red-50' },
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export default function WithdrawPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [balance, setBalance] = useState(0)
  const [minCoins, setMinCoins] = useState(1000)
  const [history, setHistory] = useState<WithdrawReq[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [coins, setCoins] = useState('')
  const [method, setMethod] = useState<'bank' | 'momo'>('bank')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [phone, setPhone] = useState('')

  const coinsNum = parseInt(coins) || 0
  const fee = Math.ceil(coinsNum * 0.05)
  const net = coinsNum - fee

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/dang-nhap'); return }
    if (status === 'authenticated') {
      if (!['AUTHOR', 'TRANSLATOR', 'ADMIN'].includes(session.user.role!)) { router.push('/'); return }
      Promise.all([
        fetch('/api/user/profile').then(r => r.json()),
        fetch('/api/withdraw-requests').then(r => r.json()),
      ]).then(([profile, hist]) => {
        setBalance(profile.coinBalance ?? 0)
        setHistory(hist.requests ?? [])
        setLoading(false)
      })
    }
  }, [status])

  const hasPending = history.some(h => ['PENDING', 'PROCESSING'].includes(h.status))

  async function submit() {
    setSubmitting(true); setError(''); setSuccess(false)
    const res = await fetch('/api/withdraw-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coins: coinsNum, method,
        accountInfo: { bankName, accountNumber, accountName, phone },
      }),
    })
    const d = await res.json()
    if (res.ok) {
      setSuccess(true); setCoins('')
      setBalance(b => b - coinsNum)
      setHistory(prev => [d.request, ...prev])
    } else { setError(d.error) }
    setSubmitting(false)
  }

  if (status === 'loading' || loading) return (
    <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Coins className="w-7 h-7 text-amber-500" /> Rút xu</h1>
        <p className="text-muted-foreground mt-1 text-sm">Quy đổi xu sang tiền mặt qua chuyển khoản ngân hàng hoặc MoMo.</p>
      </div>

      {/* Balance */}
      <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/20 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Số dư hiện tại</p>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{balance.toLocaleString()} xu</p>
        </div>
        <Coins className="w-10 h-10 text-amber-400" />
      </div>

      {/* Fee info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/60 text-sm">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-muted-foreground">
          <strong>Phí giao dịch 5%</strong> — Ví dụ: rút 1000 xu → phí 50 xu → bạn nhận 950 xu quy đổi.<br />
          Tối thiểu <strong>{minCoins.toLocaleString()} xu</strong>. Xu bị trừ ngay khi gửi yêu cầu, hoàn lại nếu bị từ chối.
        </div>
      </div>

      {hasPending && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-500/10 text-blue-600 text-sm">
          <Clock className="w-4 h-4" /> Bạn đang có yêu cầu rút xu chưa hoàn tất. Vui lòng chờ Admin xử lý.
        </div>
      )}

      {!hasPending && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-5">
          <h2 className="font-bold">Tạo yêu cầu rút xu</h2>

          {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
          {success && <div className="p-3 rounded-xl bg-green-500/10 text-green-600 text-sm">✅ Yêu cầu đã được gửi! Admin sẽ xử lý trong 1-3 ngày làm việc.</div>}

          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Số xu muốn rút <span className="text-destructive">*</span></label>
            <input value={coins} onChange={e => setCoins(e.target.value.replace(/\D/g, ''))}
              placeholder="Nhập số xu (ví dụ: 1000)" className={inputCls} />
            {coinsNum >= minCoins && (
              <div className="mt-2 p-3 rounded-xl bg-muted/60 text-xs space-y-1">
                <div className="flex justify-between"><span>Số xu rút</span><span className="font-semibold">{coinsNum.toLocaleString()} xu</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Phí (5%)</span><span>- {fee.toLocaleString()} xu</span></div>
                <div className="flex justify-between font-bold border-t border-border pt-1 mt-1"><span>Thực nhận</span><span className="text-green-600">{net.toLocaleString()} xu</span></div>
              </div>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Phương thức</label>
            <div className="grid grid-cols-2 gap-3">
              {([['bank', 'Ngân hàng', Building2], ['momo', 'MoMo', Smartphone]] as const).map(([val, label, Icon]) => (
                <button key={val} onClick={() => setMethod(val)}
                  className={`p-3 rounded-xl border-2 flex items-center gap-2 text-sm font-medium transition-all ${method === val ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Account info */}
          <div className="space-y-3">
            {method === 'bank' && (
              <input value={bankName} onChange={e => setBankName(e.target.value)}
                placeholder="Tên ngân hàng (VCB, BIDV, Techcombank...)" className={inputCls} />
            )}
            <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
              placeholder={method === 'bank' ? 'Số tài khoản' : 'Số điện thoại MoMo'} className={inputCls} />
            <input value={accountName} onChange={e => setAccountName(e.target.value)}
              placeholder="Tên chủ tài khoản" className={inputCls} />
          </div>

          <button onClick={submit}
            disabled={submitting || coinsNum < minCoins || coinsNum > balance || !accountNumber || !accountName}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-90 disabled:opacity-60 shadow-md">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            {submitting ? 'Đang gửi...' : `Rút ${coinsNum.toLocaleString()} xu`}
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold">Lịch sử rút xu</h2>
          {history.map(r => {
            const s = STATUS[r.status]
            return (
              <div key={r.id} className="p-4 rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-sm">{r.coins.toLocaleString()} xu → {r.netCoins.toLocaleString()} xu thực nhận</p>
                    <p className="text-xs text-muted-foreground">{r.method === 'bank' ? 'Ngân hàng' : 'MoMo'} • {new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                </div>
                {r.adminNote && <p className="mt-2 text-xs border-l-2 border-muted pl-3 text-muted-foreground">{r.adminNote}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
