'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Save, Loader2, Check, Camera, AlertCircle, KeyRound,
  Eye, EyeOff, Link as LinkIcon,
} from 'lucide-react'
import Link from 'next/link'

const VIETNAM_PROVINCES = [
  'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu','Bắc Ninh','Bến Tre','Bình Định',
  'Bình Dương','Bình Phước','Bình Thuận','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Đắk Nông',
  'Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Giang','Hà Nam','Hà Nội','Hà Tĩnh','Hải Dương',
  'Hải Phòng','Hậu Giang','Hòa Bình','Hưng Yên','Khánh Hòa','Kiên Giang','Kon Tum','Lai Châu','Lâm Đồng',
  'Lạng Sơn','Lào Cai','Long An','Nam Định','Nghệ An','Ninh Bình','Ninh Thuận','Phú Thọ','Phú Yên',
  'Quảng Bình','Quảng Nam','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh',
  'Thái Bình','Thái Nguyên','Thanh Hóa','Thừa Thiên Huế','Tiền Giang','TP. Hồ Chí Minh','Trà Vinh',
  'Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái',
]

const COLORS = ['from-violet-500 to-purple-600','from-blue-500 to-cyan-500','from-emerald-500 to-teal-500','from-orange-400 to-rose-500','from-pink-500 to-rose-500']

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'
const labelCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block'

interface Profile {
  id: string; name: string | null; email: string; avatar: string | null
  bio: string | null; coinBalance: number; role: string; createdAt: string
  gender?: string | null; hometown?: string | null
  facebookUrl?: string | null; tiktokUrl?: string | null; instagramUrl?: string | null
}

export default function EditProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Fields
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [gender, setGender] = useState('')
  const [hometown, setHometown] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')

  // Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then((data: Profile) => {
      setProfile(data)
      setName(data.name ?? '')
      setBio(data.bio ?? '')
      setAvatar(data.avatar ?? '')
      setAvatarPreview(data.avatar ?? '')
      setGender(data.gender ?? '')
      setHometown(data.hometown ?? '')
      setFacebookUrl(data.facebookUrl ?? '')
      setTiktokUrl(data.tiktokUrl ?? '')
      setInstagramUrl(data.instagramUrl ?? '')
    }).finally(() => setLoading(false))
  }, [])

  async function uploadAvatar(file: File) {
    setUploading(true)
    const form = new FormData(); form.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
    if (res.ok) {
      const d = await res.json()
      setAvatar(d.url); setAvatarPreview(d.url)
    }
    setUploading(false)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const res = await fetch('/api/user/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), bio: bio.trim(), avatar,
        gender: gender || '', hometown: hometown.trim(),
        facebookUrl: facebookUrl.trim(), tiktokUrl: tiktokUrl.trim(), instagramUrl: instagramUrl.trim(),
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await updateSession({ name: data.user.name, image: data.user.avatar })
    } else { setError(data.error ?? 'Lỗi lưu') }
    setSaving(false)
  }

  async function changePassword() {
    setPwError(''); setPwSuccess(false)
    if (!currentPw) { setPwError('Nhập mật khẩu hiện tại'); return }
    if (newPw.length < 6) { setPwError('Mật khẩu mới ít nhất 6 ký tự'); return }
    if (newPw !== confirmPw) { setPwError('Mật khẩu xác nhận không khớp'); return }
    setChangingPw(true)
    const res = await fetch('/api/user/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    })
    const d = await res.json()
    if (res.ok) {
      setPwSuccess(true)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setTimeout(() => setPwSuccess(false), 4000)
    } else { setPwError(d.error) }
    setChangingPw(false)
  }

  if (!session) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Vui lòng <Link href="/dang-nhap" className="text-primary hover:underline font-semibold">đăng nhập</Link> để chỉnh sửa hồ sơ.</p>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  const color = COLORS[(name?.charCodeAt(0) ?? 0) % COLORS.length]

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Chỉnh sửa hồ sơ</h1>
        <Link href={`/nguoi-dung/${profile?.id}`} className="text-sm text-primary hover:underline">
          Xem hồ sơ →
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Card 1: Avatar + Thông tin cơ bản ── */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <div className="flex gap-4 items-start">
          {/* Avatar col */}
          <div className="relative shrink-0">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-2xl font-black shadow overflow-hidden`}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                : (name?.[0]?.toUpperCase() ?? '?')}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full gradient-primary flex items-center justify-center shadow text-white hover:opacity-90 transition-opacity">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
          </div>

          {/* Fields col */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Email */}
            <div>
              <label className={labelCls}>Email</label>
              <input value={profile?.email ?? ''} disabled
                className={inputCls + ' opacity-60 cursor-not-allowed'} />
            </div>

            {/* Tên + Giới tính */}
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <label className={labelCls}>Tên hiển thị <span className="text-destructive normal-case">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={50} className={inputCls} />
                <p className="text-xs text-muted-foreground mt-0.5 text-right">{name.length}/50</p>
              </div>
              <div className="w-[120px] shrink-0">
                <label className={labelCls}>Giới tính</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* URL avatar */}
        <div>
          <label className={labelCls}>URL ảnh đại diện</label>
          <input value={avatar} onChange={e => { setAvatar(e.target.value); setAvatarPreview(e.target.value) }}
            placeholder="https://example.com/avatar.jpg" className={inputCls} />
        </div>

        {/* Bio + Quê quán */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelCls}>Giới thiệu bản thân</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Viết vài dòng về bản thân..." rows={3} maxLength={300}
              className={inputCls + ' resize-none'} />
            <p className="text-xs text-muted-foreground mt-0.5 text-right">{bio.length}/300</p>
          </div>
          <div className="w-[160px] shrink-0">
            <label className={labelCls}>Quê quán</label>
            <select value={hometown} onChange={e => setHometown(e.target.value)} className={inputCls} style={{ height: 'calc(3*2rem + 28px)' }}>
              <option value="">— Chọn —</option>
              {VIETNAM_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Card 2: Mạng xã hội ── */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <LinkIcon className="w-4 h-4 text-primary" /> Mạng xã hội
        </h2>

        {/* Facebook */}
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1877F2]/10 shrink-0">
            <svg className="w-4 h-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </span>
          <input value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/username" className={inputCls + ' flex-1'} />
        </div>

        {/* TikTok */}
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-foreground/5 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.53V6.77a4.85 4.85 0 01-1-.08z"/>
            </svg>
          </span>
          <input value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@username" className={inputCls + ' flex-1'} />
        </div>

        {/* Instagram */}
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-pink-500/10 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="url(#ig-g2)">
              <defs>
                <linearGradient id="ig-g2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/>
                </linearGradient>
              </defs>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </span>
          <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/username" className={inputCls + ' flex-1'} />
        </div>
      </div>

      {/* ── Card 3: Đổi mật khẩu (collapsed-looking) ── */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <KeyRound className="w-4 h-4 text-primary" /> Đổi mật khẩu
        </h2>
        {pwError && <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><AlertCircle className="w-4 h-4 shrink-0"/> {pwError}</div>}
        {pwSuccess && <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm">✅ Đổi mật khẩu thành công!</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Mật khẩu hiện tại</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                placeholder="••••••••" className={inputCls + ' pr-9'} />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Mật khẩu mới</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                placeholder="••••••••" className={inputCls + ' pr-9'} />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
              </button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Xác nhận</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              placeholder="••••••••" className={inputCls} />
          </div>
        </div>
        {confirmPw && newPw !== confirmPw && <p className="text-xs text-destructive">❌ Mật khẩu không khớp</p>}
        {confirmPw && newPw === confirmPw && newPw.length >= 6 && <p className="text-xs text-green-600">✅ Mật khẩu khớp</p>}

        <button onClick={changePassword} disabled={changingPw || !currentPw || !newPw || !confirmPw}
          className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60">
          {changingPw ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <KeyRound className="w-3.5 h-3.5"/>}
          {changingPw ? 'Đang đổi...' : 'Đổi mật khẩu'}
        </button>
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving || !name.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-90 disabled:opacity-60 shadow transition-opacity">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Đang lưu...' : saved ? '✅ Đã lưu!' : 'Lưu thay đổi'}
      </button>
    </div>
  )
}
