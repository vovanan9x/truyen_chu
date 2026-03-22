'use client'

import { useState } from 'react'
import { Coins, Landmark, Smartphone, CreditCard, ChevronDown, Check, Loader2, AlertCircle, Clock, ExternalLink } from 'lucide-react'

interface Package { coins: number; price: number; bonus: number; label: string; highlight?: boolean; badge?: string }
interface Props { settings: Record<string, string>; packages: Package[] }

const METHOD_CONFIG = {
  bank:  { label: 'Chuyển khoản ngân hàng', icon: Landmark, color: 'text-blue-600' },
  momo:  { label: 'Ví MoMo', icon: Smartphone, color: 'text-purple-600' },
  vnpay: { label: 'VNPay', icon: CreditCard, color: 'text-blue-500' },
}

export default function NapCoinClient({ settings, packages }: Props) {
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null)
  const [method, setMethod] = useState<'bank' | 'momo' | 'vnpay'>('bank')
  const [transactionId, setTransactionId] = useState('')
  const [note, setNote] = useState('')
  const [step, setStep] = useState<'select' | 'pay' | 'submitted'>('select')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [myRequests, setMyRequests] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const hasBank  = !!(settings.bank_account && settings.bank_name)
  const hasMomo  = !!settings.momo_number
  const hasVnpay = !!settings.vnpay_merchant

  const availableMethods = [
    hasBank  && { id: 'bank'  as const, ...METHOD_CONFIG.bank },
    hasMomo  && { id: 'momo'  as const, ...METHOD_CONFIG.momo },
    hasVnpay && { id: 'vnpay' as const, ...METHOD_CONFIG.vnpay },
  ].filter(Boolean) as { id: 'bank'|'momo'|'vnpay'; label: string; icon: any; color: string }[]

  async function loadHistory() {
    setLoadingHistory(true)
    const res = await fetch('/api/user/payment')
    if (res.ok) { const d = await res.json(); setMyRequests(d.requests) }
    setLoadingHistory(false); setShowHistory(true)
  }

  async function submit() {
    if (!selectedPkg) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/user/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageCoins: selectedPkg.coins + selectedPkg.bonus,
          packagePrice: selectedPkg.price,
          method, transactionId, note,
        }),
      })
      const d = await res.json()
      if (res.ok) { setStep('submitted') }
      else { setError(d.error ?? 'Lỗi gửi yêu cầu') }
    } catch { setError('Lỗi kết nối') }
    setSubmitting(false)
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
          <Coins className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold">Nạp xu</h1>
        <p className="text-muted-foreground">Mua xu để mở khoá các chương VIP yêu thích</p>
      </div>

      {/* No payment method configured */}
      {availableMethods.length === 0 && (
        <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-center text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-10 h-10 mx-auto mb-3" />
          <p className="font-semibold">Chức năng nạp xu tạm thời chưa khả dụng</p>
          <p className="text-sm mt-1">Admin chưa cấu hình phương thức thanh toán. Vui lòng quay lại sau.</p>
        </div>
      )}

      {availableMethods.length > 0 && step === 'select' && (
        <>
          {/* Package grid */}
          <div>
            <h2 className="text-lg font-semibold mb-4">1. Chọn gói xu</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {packages.map(pkg => (
                <button key={pkg.coins} type="button" onClick={() => setSelectedPkg(pkg)}
                  className={`relative rounded-2xl border-2 p-5 text-center cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    selectedPkg?.coins === pkg.coins
                      ? 'border-primary ring-2 ring-primary/20 shadow-md'
                      : pkg.highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                  }`}>
                  {pkg.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full gradient-primary text-white text-xs font-bold shadow-sm whitespace-nowrap">
                      Phổ biến
                    </span>
                  )}
                  {pkg.badge && <span className="absolute -top-2 -right-2 text-lg">{pkg.badge}</span>}
                  <div className="text-3xl font-black text-amber-500 mb-1">{pkg.coins + pkg.bonus}</div>
                  <div className="text-xs text-muted-foreground mb-3">
                    xu {pkg.bonus > 0 && <span className="text-green-500 font-medium">(+{pkg.bonus} bonus)</span>}
                  </div>
                  <div className="text-lg font-bold">{pkg.price.toLocaleString('vi-VN')}đ</div>
                  {selectedPkg?.coins === pkg.coins && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Method select */}
          <div>
            <h2 className="text-lg font-semibold mb-4">2. Chọn phương thức</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {availableMethods.map(m => {
                const Icon = m.icon
                return (
                  <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      method === m.id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                    }`}>
                    <Icon className={`w-6 h-6 ${m.color}`} />
                    <span className="font-medium text-sm">{m.label}</span>
                    {method === m.id && <Check className="w-4 h-4 text-primary ml-auto" />}
                  </button>
                )
              })}
            </div>
          </div>

          <button onClick={() => { if (selectedPkg) setStep('pay') }} disabled={!selectedPkg}
            className="w-full py-3.5 rounded-xl gradient-primary text-white font-bold text-lg hover:opacity-90 disabled:opacity-40 shadow-md transition-opacity">
            Tiếp theo →
          </button>
        </>
      )}

      {/* Step 2: Payment info */}
      {step === 'pay' && selectedPkg && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => setStep('select')} className="hover:text-primary transition-colors">← Quay lại</button>
          </div>

          <div className="p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gói đã chọn</p>
              <p className="font-bold text-xl text-amber-500">{selectedPkg.coins + selectedPkg.bonus} xu</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Số tiền</p>
              <p className="font-bold text-xl">{selectedPkg.price.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>

          {/* Bank info */}
          {method === 'bank' && hasBank && (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Landmark className="w-4 h-4 text-blue-600" /> Thông tin chuyển khoản</h3>
              <div className="space-y-2 text-sm">
                {[
                  ['Ngân hàng', settings.bank_name],
                  ['Số tài khoản', settings.bank_account],
                  ['Chủ tài khoản', settings.bank_holder],
                  ['Chi nhánh', settings.bank_branch || ''],
                  ['Số tiền', `${selectedPkg.price.toLocaleString('vi-VN')} VND`],
                ].filter(([, v]) => !!v).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold font-mono">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-xl">
                📝 Nội dung chuyển khoản: <strong>NAPXU [email của bạn]</strong>
              </p>
            </div>
          )}

          {/* MoMo info */}
          {method === 'momo' && hasMomo && (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="font-semibold flex items-center gap-2"><Smartphone className="w-4 h-4 text-purple-600" /> Thanh toán MoMo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Số điện thoại</span>
                  <span className="font-bold font-mono text-purple-600">{settings.momo_number}</span>
                </div>
                {settings.momo_name && (
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Tên</span>
                    <span className="font-semibold">{settings.momo_name}</span>
                  </div>
                )}
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Số tiền</span>
                  <span className="font-bold">{selectedPkg.price.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit form */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h3 className="font-semibold">Xác nhận đã thanh toán</h3>
            <div>
              <label className="text-sm font-medium block mb-1.5">Mã giao dịch (nếu có)</label>
              <input value={transactionId} onChange={e => setTransactionId(e.target.value)}
                placeholder="Số biên nhận, order ID..." className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Ghi chú</label>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Thêm thông tin để admin xét duyệt nhanh hơn..."
                rows={2} className={inputCls + ' resize-none'} />
            </div>
            {settings.payment_note && (
              <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-xl">{settings.payment_note}</p>
            )}
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <button onClick={submit} disabled={submitting}
              className="w-full py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-90 disabled:opacity-60 shadow-md">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Đang gửi...</> : '✅ Gửi yêu cầu nạp xu'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Submitted */}
      {step === 'submitted' && (
        <div className="text-center py-12 space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold">Yêu cầu đã được gửi!</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Admin sẽ xét duyệt và cộng xu vào tài khoản của bạn trong vòng 5-15 phút.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => { setStep('select'); setSelectedPkg(null); setTransactionId(''); setNote('') }}
              className="px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold hover:opacity-90">
              Nạp tiếp
            </button>
            <button onClick={loadHistory}
              className="px-5 py-2.5 rounded-xl border border-border font-medium hover:bg-muted transition-colors text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Lịch sử nạp
            </button>
          </div>
        </div>
      )}

      {/* History panel */}
      {(step === 'select' || step === 'submitted') && (
        <div>
          <button onClick={showHistory ? () => setShowHistory(false) : loadHistory}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />}
            Lịch sử yêu cầu nạp xu của tôi
          </button>
          {showHistory && myRequests.length > 0 && (
            <div className="mt-3 space-y-2">
              {myRequests.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-border text-sm">
                  <div>
                    <span className="font-semibold text-amber-500">{r.packageCoins} xu</span>
                    {' · '}{r.packagePrice.toLocaleString('vi-VN')}đ
                    {' · '}<span className="text-muted-foreground">{r.method}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    r.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status === 'APPROVED' ? '✅ Đã duyệt' : r.status === 'REJECTED' ? '❌ Từ chối' : '⏳ Đang chờ'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
