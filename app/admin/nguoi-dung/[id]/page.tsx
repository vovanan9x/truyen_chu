'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Coins, Shield, BookMarked, Clock, Bell, Key,
  CheckCircle, AlertCircle, Loader2, Ban, UserCheck,
  MapPin, Facebook, Globe, User, BookOpen, MessageSquare
} from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'

const ROLE_OPTIONS = ['READER', 'AUTHOR', 'TRANSLATOR', 'MOD', 'ADMIN']
const BAN_DAYS = [
  { label: '1 ngày', v: 1 }, { label: '7 ngày', v: 7 },
  { label: '30 ngày', v: 30 }, { label: 'Vĩnh viễn', v: 0 },
]

type Tab = 'info' | 'history' | 'bookmarks' | 'comments'

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [tab, setTab] = useState<Tab>('info')

  // Forms
  const [coinDelta, setCoinDelta] = useState('')
  const [coinNote, setCoinNote] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [notifyLink, setNotifyLink] = useState('')
  const [banReason, setBanReason] = useState('')
  const [banDays, setBanDays] = useState(7)
  const [showBanForm, setShowBanForm] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/users/${params.id}`)
      .then(r => r.json())
      .then(setUser)
      .finally(() => setLoading(false))
  }, [params.id])

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  async function apiCall(url: string, method: string, body: object) {
    setSaving(true)
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    return { ok: res.ok, data }
  }

  async function changeRole(role: string) {
    const { ok, data } = await apiCall(`/api/admin/users/${params.id}`, 'PATCH', { role })
    if (ok) { setUser((u: any) => ({ ...u, role: data.user.role })); showMsg('success', 'Đã cập nhật quyền!') }
    else showMsg('error', data.error || 'Lỗi')
  }

  async function adjustCoins() {
    const delta = parseInt(coinDelta)
    if (isNaN(delta) || delta === 0) { showMsg('error', 'Nhập số xu hợp lệ'); return }
    const { ok, data } = await apiCall(`/api/admin/users/${params.id}`, 'PATCH', { coinDelta: delta, note: coinNote })
    if (ok) {
      setUser((u: any) => ({ ...u, coinBalance: u.coinBalance + delta }))
      setCoinDelta(''); setCoinNote('')
      showMsg('success', `Đã ${delta > 0 ? 'cộng' : 'trừ'} ${Math.abs(delta)} xu!`)
    } else showMsg('error', data.error || 'Lỗi')
  }

  async function resetPassword() {
    if (newPassword.length < 6) { showMsg('error', 'Mật khẩu phải ≥ 6 ký tự'); return }
    const { ok, data } = await apiCall(`/api/admin/users/${params.id}/reset-password`, 'POST', { newPassword })
    if (ok) { setNewPassword(''); showMsg('success', 'Đã reset mật khẩu!') }
    else showMsg('error', data.error || 'Lỗi')
  }

  async function sendNotify() {
    if (!notifyTitle || !notifyMsg) { showMsg('error', 'Nhập tiêu đề và nội dung'); return }
    const { ok, data } = await apiCall(`/api/admin/users/${params.id}/notify`, 'POST', {
      title: notifyTitle, message: notifyMsg, link: notifyLink,
    })
    if (ok) { setNotifyTitle(''); setNotifyMsg(''); setNotifyLink(''); showMsg('success', 'Đã gửi thông báo!') }
    else showMsg('error', data.error || 'Lỗi')
  }

  async function banUser() {
    const { ok, data } = await apiCall(`/api/admin/users/${params.id}`, 'DELETE', {
      banReason, banDays: banDays || null,
    })
    if (ok) { setUser((u: any) => ({ ...u, isBanned: true, banReason })); setShowBanForm(false); showMsg('success', 'Đã cấm user!') }
    else showMsg('error', data.error || 'Lỗi')
  }

  async function unbanUser() {
    const { ok } = await apiCall(`/api/admin/users/${params.id}/unban`, 'POST', {})
    if (ok) { setUser((u: any) => ({ ...u, isBanned: false, banReason: null })); showMsg('success', 'Đã gỡ cấm!') }
  }

  if (loading) return <div className="py-16 text-center text-muted-foreground animate-pulse">Đang tải...</div>
  if (!user) return <div className="py-16 text-center text-destructive">Không tìm thấy người dùng.</div>

  const inputCls = 'px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm'
  const roleCls: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    MOD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    AUTHOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    TRANSLATOR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    READER: 'bg-muted text-muted-foreground',
  }
  const roleNames: Record<string, string> = { ADMIN: '🛡 Admin', MOD: '🔰 Mod', AUTHOR: '✍ Tác giả', TRANSLATOR: '🌐 Dịch giả', READER: 'Thành viên' }
  const genderMap: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/nguoi-dung" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Người dùng
        </Link>
        <h1 className="text-xl font-bold">{user.name || '(chưa đặt tên)'}</h1>
        <span className="text-xs text-muted-foreground">#{user.displayId}</span>
        {user.isBanned && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">🚫 Bị cấm</span>}
      </div>

      {/* Alert */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Profile card */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user.avatar ? (
              <Image src={user.avatar} alt={user.name || ''} width={72} height={72}
                className="w-18 h-18 rounded-2xl object-cover" />
            ) : (
              <div className="w-[72px] h-[72px] rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold">
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg">{user.name}</h2>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleCls[user.role] || ''}`}>
                {roleNames[user.role] || user.role}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.bio && <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{user.bio}</p>}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {user.gender && <span className="flex items-center gap-1"><User className="w-3 h-3" />{genderMap[user.gender] || user.gender}</span>}
              {user.hometown && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{user.hometown}</span>}
              {user.facebookUrl && <a href={user.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600"><Facebook className="w-3 h-3" />Facebook</a>}
              {user.tiktokUrl && <a href={user.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="w-3 h-3" />TikTok</a>}
              {user.instagramUrl && <a href={user.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-pink-600"><Globe className="w-3 h-3" />Instagram</a>}
            </div>
          </div>
          {/* Stats */}
          <div className="hidden sm:flex flex-col items-end gap-1 text-sm text-right">
            <span className="font-bold text-amber-500">{formatNumber(user.coinBalance)} xu</span>
            <span className="text-muted-foreground text-xs">Lv{user.level} · {user.xp} XP</span>
            <span className="text-muted-foreground text-xs">{user.followerCount} followers</span>
            <span className="text-muted-foreground text-xs">Đăng ký {formatDate(user.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {([
          ['info', '⚙ Quản lý'],
          ['history', '📖 Lịch sử đọc'],
          ['bookmarks', '🔖 Bookmark'],
          ['comments', '💬 Bình luận'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t as Tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {label}
            {t === 'comments' && user._count?.comments > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                {user._count.comments}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: info / quản lý */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Quyền */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Quyền & Trạng thái</h2>
            <div className="space-y-2">
              <label className="text-xs font-medium block">Đổi quyền</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(r => (
                  <button key={r} onClick={() => changeRole(r)} disabled={saving || user.role === r}
                    className={`py-2 rounded-xl border text-sm font-medium transition-colors ${user.role === r ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'} disabled:opacity-50`}>
                    {roleNames[r] || r}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              {user.isBanned ? (
                <button onClick={unbanUser} disabled={saving}
                  className="w-full py-2.5 rounded-xl border border-green-500 text-green-600 hover:bg-green-50 text-sm font-medium flex items-center justify-center gap-2">
                  <UserCheck className="w-4 h-4" />Gỡ cấm
                </button>
              ) : (
                <>
                  {!showBanForm ? (
                    <button onClick={() => setShowBanForm(true)}
                      className="w-full py-2.5 rounded-xl border border-destructive/50 text-destructive hover:bg-destructive/5 text-sm font-medium flex items-center justify-center gap-2">
                      <Ban className="w-4 h-4" />Cấm user
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={2}
                        placeholder="Lý do cấm" className={`${inputCls} w-full resize-none`} />
                      <div className="grid grid-cols-2 gap-2">
                        {BAN_DAYS.map(d => (
                          <button key={d.v} onClick={() => setBanDays(d.v)}
                            className={`py-1.5 rounded-xl border text-xs font-medium ${banDays === d.v ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border hover:bg-muted'}`}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowBanForm(false)} className="flex-1 py-2 rounded-xl border text-sm">Huỷ</button>
                        <button onClick={banUser} disabled={saving}
                          className="flex-1 py-2 rounded-xl bg-destructive text-white text-sm font-medium flex items-center justify-center gap-1">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}Cấm
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Xu */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Coins className="w-4 h-4 text-amber-500" />Điều chỉnh xu</h2>
            <div className="text-2xl font-bold text-amber-500">{formatNumber(user.coinBalance)} xu</div>
            <div className="space-y-2">
              <input type="number" value={coinDelta} onChange={e => setCoinDelta(e.target.value)}
                placeholder="+ cộng / - trừ" className={`${inputCls} w-full`} />
              <input value={coinNote} onChange={e => setCoinNote(e.target.value)}
                placeholder="Ghi chú" className={`${inputCls} w-full`} />
              <button onClick={adjustCoins} disabled={saving}
                className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Điều chỉnh xu
              </button>
            </div>
          </div>

          {/* Reset mật khẩu */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Key className="w-4 h-4 text-orange-500" />Reset mật khẩu</h2>
            <div className="space-y-2">
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Mật khẩu mới (≥ 6 ký tự)" className={`${inputCls} w-full`} />
              <button onClick={resetPassword} disabled={saving}
                className="w-full py-2.5 rounded-xl border border-orange-500 text-orange-600 hover:bg-orange-50 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}Reset mật khẩu
              </button>
            </div>
          </div>

          {/* Gửi thông báo */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-blue-500" />Gửi thông báo</h2>
            <div className="space-y-2">
              <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)}
                placeholder="Tiêu đề" className={`${inputCls} w-full`} />
              <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} rows={2}
                placeholder="Nội dung thông báo" className={`${inputCls} w-full resize-none`} />
              <input value={notifyLink} onChange={e => setNotifyLink(e.target.value)}
                placeholder="Link (tuỳ chọn)" className={`${inputCls} w-full`} />
              <button onClick={sendNotify} disabled={saving}
                className="w-full py-2.5 rounded-xl border border-blue-500 text-blue-600 hover:bg-blue-50 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}Gửi thông báo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Lịch sử đọc */}
      {tab === 'history' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Lịch sử đọc ({user._count?.readingHistory ?? 0} truyện)
          </div>
          {user.readingHistory?.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground font-semibold">Truyện</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Chương đọc</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-semibold">Cập nhật</th>
              </tr></thead>
              <tbody className="divide-y divide-border/50">
                {user.readingHistory.slice(0, 20).map((h: any) => (
                  <tr key={h.storyId} className="hover:bg-muted/20">
                    <td className="px-5 py-3 font-medium">{h.story?.title || h.storyId}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">Chương {h.lastChapterNum}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(h.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chưa có lịch sử đọc</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Bookmark */}
      {tab === 'bookmarks' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-primary" />
            Truyện theo dõi ({user._count?.bookmarks ?? 0})
          </div>
          {user.bookmarks?.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-5 py-3 text-muted-foreground font-semibold">Truyện</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-semibold">Thêm vào</th>
              </tr></thead>
              <tbody className="divide-y divide-border/50">
                {user.bookmarks.slice(0, 20).map((b: any) => (
                  <tr key={b.storyId} className="hover:bg-muted/20">
                    <td className="px-5 py-3 font-medium">{b.story?.title || b.storyId}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <BookMarked className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chưa theo dõi truyện nào</p>
            </div>
          )}
        </div>
      )}

      {/* Giao dịch gần đây */}
      {user.transactions?.length > 0 && tab === 'info' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border font-semibold flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />Lịch sử giao dịch gần đây
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-3 text-muted-foreground font-semibold">Loại</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Xu</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-semibold">Trạng thái</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-semibold">Ngày</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {user.transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">{tx.type === 'DEPOSIT' ? '💰 Nạp xu' : tx.type === 'UNLOCK' ? '🔓 Mở chương' : tx.type}</td>
                  <td className={`px-4 py-3 text-center font-medium ${tx.coinAmount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.coinAmount > 0 ? '+' : ''}{tx.coinAmount}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Bình luận */}
      {tab === 'comments' && (
        <AdminUserComments userId={params.id} commentCount={user._count?.comments ?? 0} />
      )}
    </div>
  )
}

// Sub-component load comments của user
function AdminUserComments({ userId, commentCount }: { userId: string; commentCount: number }) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/comments`)
      .then(r => r.json())
      .then(d => setComments(d.comments ?? []))
      .finally(() => setLoading(false))
  }, [userId])

  async function deleteComment(id: string) {
    if (!confirm('Xoá bình luận này?')) return
    await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' })
    setComments(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground animate-pulse text-sm">Đang tải...</div>

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border font-semibold flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        Bình luận của user ({commentCount})
      </div>
      {comments.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Chưa có bình luận nào</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {comments.map((c: any) => (
            <div key={c.id} className="px-5 py-4 hover:bg-muted/20 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Link href={`/truyen/${c.story?.slug}`} target="_blank"
                    className="text-primary hover:underline font-medium truncate max-w-[200px]">
                    {c.story?.title}
                  </Link>
                  <Link href={`/truyen/${c.story?.slug}#comment-${c.id}`} target="_blank"
                    className="hover:underline underline-offset-2 opacity-60">
                    Xem
                  </Link>
                  <span className="ml-auto">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
              <button onClick={() => deleteComment(c.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                <Loader2 className="w-4 h-4 hidden" />
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
