'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Check, CreditCard, Landmark, Smartphone, AlertCircle } from 'lucide-react'

const DEFAULT_SETTINGS = {
  // Bank transfer
  bank_name: '', bank_account: '', bank_holder: '', bank_branch: '',
  // MoMo
  momo_number: '', momo_name: '',
  // VNPay
  vnpay_merchant: '',
  // General
  payment_note: 'Sau khi chuyển khoản, vui lòng gửi ảnh chụp màn hình trong phần yêu cầu nạp xu. Xu sẽ được cộng trong 5-15 phút.',
}

type Settings = typeof DEFAULT_SETTINGS

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

export default function AdminPaymentSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      setSettings(prev => ({ ...prev, ...data }))
    }).finally(() => setLoading(false))
  }, [])

  function set(key: keyof Settings, val: string) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
      else { const d = await res.json(); setError(d.error ?? 'Lỗi lưu') }
    } catch { setError('Lỗi kết nối') }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="animate-spin w-5 h-5" /> Đang tải...</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" /> Cài đặt thanh toán
        </h1>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 disabled:opacity-60 shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Đang lưu...' : saved ? '✅ Đã lưu!' : 'Lưu cài đặt'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Bank Transfer */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Landmark className="w-4 h-4 text-primary" /> Chuyển khoản ngân hàng</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Tên ngân hàng</label>
            <input value={settings.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Vietcombank, BIDV, MB..." className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Số tài khoản</label>
            <input value={settings.bank_account} onChange={e => set('bank_account', e.target.value)} placeholder="123456789" className={inputCls + ' font-mono'} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Chủ tài khoản</label>
            <input value={settings.bank_holder} onChange={e => set('bank_holder', e.target.value)} placeholder="NGUYEN VAN A" className={inputCls + ' uppercase'} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Chi nhánh (tuỳ chọn)</label>
            <input value={settings.bank_branch} onChange={e => set('bank_branch', e.target.value)} placeholder="Chi nhánh Hà Nội" className={inputCls} />
          </div>
        </div>
      </div>

      {/* MoMo */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Smartphone className="w-4 h-4 text-purple-500" /> Ví MoMo</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Số điện thoại MoMo</label>
            <input value={settings.momo_number} onChange={e => set('momo_number', e.target.value)} placeholder="0901234567" className={inputCls + ' font-mono'} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Tên hiển thị</label>
            <input value={settings.momo_name} onChange={e => set('momo_name', e.target.value)} placeholder="Nguyễn Văn A" className={inputCls} />
          </div>
        </div>
      </div>

      {/* VNPay */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" /> VNPay</h2>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Merchant ID / Thông tin VNPay</label>
          <input value={settings.vnpay_merchant} onChange={e => set('vnpay_merchant', e.target.value)} placeholder="VNPay Merchant ID hoặc link thanh toán" className={inputCls} />
        </div>
      </div>

      {/* General note */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold">Ghi chú hiển thị cho người dùng</h2>
        <textarea value={settings.payment_note} onChange={e => set('payment_note', e.target.value)}
          rows={3} className={inputCls + ' resize-none'} />
      </div>
    </div>
  )
}
