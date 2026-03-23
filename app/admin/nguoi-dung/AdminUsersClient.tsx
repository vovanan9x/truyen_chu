'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Edit2, Ban, CheckCircle, X, AlertCircle, Loader2, UserCheck, ExternalLink } from 'lucide-react'

interface User {
  id: string; displayId: number; name: string | null; email: string; role: string
  avatar: string | null; coinBalance: number; createdAt: string; isBanned: boolean
  banReason: string | null; level: number; xp: number; followerCount: number
  _count: { bookmarks: number; readingHistory: number }
}

const ROLE_OPTIONS = ['READER', 'AUTHOR', 'TRANSLATOR', 'MOD', 'ADMIN']
const BAN_DAYS = [
  { label: '1 ngày', v: 1 }, { label: '7 ngày', v: 7 },
  { label: '30 ngày', v: 30 }, { label: 'Vĩnh viễn', v: 0 },
]

function Avatar({ user }: { user: User }) {
  if (user.avatar) {
    return (
      <Image
        src={user.avatar}
        alt={user.name || ''}
        width={32}
        height={32}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
      {user.name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function AdminUsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [banUser, setBanUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', coinDelta: '' })
  const [banForm, setBanForm] = useState({ reason: '', days: 7 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openEdit(u: User) {
    setEditUser(u)
    setEditForm({ name: u.name || '', email: u.email, role: u.role, coinDelta: '' })
    setError('')
  }

  async function saveEdit() {
    if (!editUser) return
    setSaving(true); setError('')
    const body: any = { name: editForm.name, email: editForm.email, role: editForm.role }
    if (editForm.coinDelta && !isNaN(+editForm.coinDelta)) body.coinDelta = parseInt(editForm.coinDelta)
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      const d = await res.json()
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...d.user } : u))
      setEditUser(null)
    } else {
      const d = await res.json(); setError(d.error || 'Lỗi cập nhật')
    }
    setSaving(false)
  }

  async function saveBan() {
    if (!banUser) return
    setSaving(true); setError('')
    const res = await fetch(`/api/admin/users/${banUser.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banReason: banForm.reason, banDays: banForm.days || null }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === banUser.id ? { ...u, isBanned: true, banReason: banForm.reason } : u))
      setBanUser(null)
    } else { const d = await res.json(); setError(d.error || 'Lỗi ban') }
    setSaving(false)
  }

  async function unban(userId: string) {
    await fetch(`/api/admin/users/${userId}/unban`, { method: 'POST' })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: false, banReason: null } : u))
  }

  const roleBadge = (role: string, isBanned: boolean) => {
    if (isBanned) return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">🚫 Bị cấm</span>
    const cls: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      MOD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      AUTHOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      TRANSLATOR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      READER: 'bg-muted text-muted-foreground',
    }
    const names: Record<string, string> = { ADMIN: '🛡 Admin', MOD: '⚡ Mod', AUTHOR: '✍ Tác giả', TRANSLATOR: '🌐 Dịch giả', READER: 'Thành viên' }
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[role] || ''}`}>{names[role] || role}</span>
  }

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm'

  return (
    <>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Người dùng</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Quyền</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Xu</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Lv</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Followers</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-muted/30 transition-colors ${u.isBanned ? 'bg-red-50/30 dark:bg-red-950/20' : ''}`}>
                  {/* Avatar + Name + Email */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <div>
                        <Link href={`/admin/nguoi-dung/${u.id}`} className="font-medium hover:text-primary transition-colors flex items-center gap-1">
                          {u.name || '(chưa đặt tên)'}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </Link>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        <p className="text-xs text-muted-foreground/60">#{u.displayId}</p>
                        {u.isBanned && u.banReason && <p className="text-xs text-destructive mt-0.5">🚫 {u.banReason}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">{roleBadge(u.role, u.isBanned)}</td>
                  <td className="px-4 py-3.5 text-center hidden md:table-cell font-medium text-amber-600">
                    {u.coinBalance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-center hidden md:table-cell">
                    <span className="text-xs font-bold text-primary">Lv{u.level}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-muted-foreground hidden lg:table-cell text-xs">
                    {u.followerCount}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(u)} title="Chỉnh sửa"
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.isBanned ? (
                        <button onClick={() => unban(u.id)} title="Gỡ cấm"
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600">
                          <UserCheck className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBanUser(u); setBanForm({ reason: '', days: 7 }); setError('') }}
                          title="Cấm user"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-destructive">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-lg">Chỉnh sửa: {editUser.name}</h3>
              <button onClick={() => setEditUser(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tên hiển thị</label>
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
                <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Quyền</label>
                <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                  className={inputCls}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Điều chỉnh xu (+ hoặc -)</label>
                <input type="number" value={editForm.coinDelta}
                  onChange={e => setEditForm(p => ({ ...p, coinDelta: e.target.value }))}
                  placeholder="Ví dụ: 100 hoặc -50" className={inputCls} />
              </div>
              {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={() => setEditUser(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-sm">Huỷ</button>
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-bold text-lg text-destructive flex items-center gap-2"><Ban className="w-5 h-5" />Cấm user</h3>
              <button onClick={() => setBanUser(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">Cấm <strong>{banUser.name}</strong>?</p>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Lý do cấm</label>
                <textarea value={banForm.reason} onChange={e => setBanForm(p => ({ ...p, reason: e.target.value }))}
                  rows={3} placeholder="Vi phạm nội quy, spam, v.v."
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-destructive/30 text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">Thời hạn</label>
                <div className="grid grid-cols-2 gap-2">
                  {BAN_DAYS.map(d => (
                    <button key={d.v} onClick={() => setBanForm(p => ({ ...p, days: d.v }))}
                      className={`py-2 rounded-xl border text-sm font-medium transition-colors ${banForm.days === d.v ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border hover:bg-muted'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-border">
              <button onClick={() => setBanUser(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-sm">Huỷ</button>
              <button onClick={saveBan} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}Cấm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
