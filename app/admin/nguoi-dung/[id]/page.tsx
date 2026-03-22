'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Coins, Shield, BookMarked, Clock } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [coinDelta, setCoinDelta] = useState('')
  const [coinNote, setCoinNote] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/admin/users/${params.id}`).then(r => r.json()).then(setUser).finally(() => setLoading(false))
  }, [params.id])

  async function changeRole(role: string) {
    setSaving(true); setMessage('')
    const res = await fetch(`/api/admin/users/${params.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    const data = await res.json()
    if (res.ok) { setUser((u: any) => ({ ...u, role: data.user.role })); setMessage('Đã cập nhật quyền!') }
    setSaving(false)
  }

  async function adjustCoins() {
    const delta = parseInt(coinDelta)
    if (isNaN(delta) || delta === 0) { setMessage('Nhập số xu hợp lệ'); return }
    setSaving(true); setMessage('')
    const res = await fetch(`/api/admin/users/${params.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coinDelta: delta, note: coinNote }) })
    const data = await res.json()
    if (res.ok) { setUser((u: any) => ({ ...u, coinBalance: u.coinBalance + delta })); setCoinDelta(''); setCoinNote(''); setMessage(`Đã ${delta > 0 ? 'cộng' : 'trừ'} ${Math.abs(delta)} xu!`) }
    setSaving(false)
  }

  if (loading) return <div className="py-16 text-center text-muted-foreground animate-pulse">Đang tải...</div>
  if (!user) return <div className="py-16 text-center text-destructive">Không tìm thấy người dùng.</div>

  const inputCls = 'px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/nguoi-dung" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Người dùng
        </Link>
        <h1 className="text-xl font-bold">{user.name}</h1>
      </div>

      {message && <div className="px-4 py-3 rounded-xl bg-green-100 text-green-700 text-sm dark:bg-green-900/30 dark:text-green-400">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Info card */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Thông tin</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{user.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Xu</span><span className="font-bold text-amber-500">{formatNumber(user.coinBalance)} xu</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Theo dõi</span><span>{user._count?.bookmarks ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Đã đọc</span><span>{user._count?.readingHistory ?? 0} chương</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Quyền</span>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground'}`}>{user.role}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => changeRole(user.role === 'ADMIN' ? 'READER' : 'ADMIN')} disabled={saving}
              className="flex-1 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
              {user.role === 'ADMIN' ? 'Hạ xuống Thành viên' : '⬆ Nâng lên Admin'}
            </button>
          </div>
        </div>

        {/* Coins card */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><Coins className="w-4 h-4 text-amber-500" /> Điều chỉnh xu</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1">Số xu (+ tặng, − trừ)</label>
              <input type="number" value={coinDelta} onChange={e => setCoinDelta(e.target.value)} placeholder="vd: 100 hoặc -50" className={inputCls + ' w-full'} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Ghi chú</label>
              <input value={coinNote} onChange={e => setCoinNote(e.target.value)} placeholder="Lý do điều chỉnh" className={inputCls + ' w-full'} />
            </div>
            <button onClick={adjustCoins} disabled={saving}
              className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              {saving ? 'Đang xử lý...' : 'Điều chỉnh xu'}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions */}
      {user.transactions?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold">Lịch sử giao dịch gần đây</div>
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Loại</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Xu</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Trạng thái</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Ngày</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {user.transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">{tx.type === 'DEPOSIT' ? '💰 Nạp xu' : tx.type === 'UNLOCK' ? '🔓 Mở chương' : tx.type}</td>
                  <td className={`px-4 py-3 text-center font-medium ${tx.coinAmount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.coinAmount > 0 ? '+' : ''}{tx.coinAmount}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{tx.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
