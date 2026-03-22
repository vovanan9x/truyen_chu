'use client'

import { useState } from 'react'
import { Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import AvatarUpload from '@/components/user/AvatarUpload'

const VIETNAM_PROVINCES = [
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
  'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh',
  'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên',
  'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An',
  'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình',
  'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng',
  'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'TP. Hồ Chí Minh', 'Trà Vinh', 'Tuyên Quang',
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
]

interface Props {
  user: {
    id: string
    name: string | null
    bio: string | null
    avatar: string | null
    email: string
    gender: string | null
    hometown: string | null
    facebookUrl: string | null
    tiktokUrl: string | null
    instagramUrl: string | null
  }
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm'
const labelCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block'

export default function EditProfileForm({ user }: Props) {
  const [name, setName] = useState(user.name ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [avatar, setAvatar] = useState(user.avatar)
  const [gender, setGender] = useState(user.gender ?? '')
  const [hometown, setHometown] = useState(user.hometown ?? '')
  const [facebookUrl, setFacebookUrl] = useState(user.facebookUrl ?? '')
  const [tiktokUrl, setTiktokUrl] = useState(user.tiktokUrl ?? '')
  const [instagramUrl, setInstagramUrl] = useState(user.instagramUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) { setMsg({ type: 'err', text: 'Tên phải ít nhất 2 ký tự' }); return }
    setSaving(true); setMsg(null)
    const res = await fetch('/api/user/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), bio: bio.trim(), gender: gender || '',
        hometown: hometown.trim(),
        facebookUrl: facebookUrl.trim(), tiktokUrl: tiktokUrl.trim(), instagramUrl: instagramUrl.trim(),
      }),
    })
    const d = await res.json()
    setSaving(false)
    if (res.ok) setMsg({ type: 'ok', text: 'Đã lưu thông tin!' })
    else setMsg({ type: 'err', text: d.error || 'Lỗi lưu' })
  }

  return (
    <form onSubmit={save} className="space-y-5">

      {/* ── Row 1: Avatar + Name/Gender/Hometown ── */}
      <div className="flex gap-5 items-start">
        {/* Avatar col */}
        <div className="shrink-0">
          <AvatarUpload currentAvatar={avatar} userName={user.name} onSuccess={url => setAvatar(url)} />
        </div>

        {/* Right col */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Email (read-only) */}
          <div>
            <label className={labelCls}>Email</label>
            <input value={user.email} disabled
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground text-sm cursor-not-allowed" />
          </div>

          {/* Tên + Giới tính (same row) */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <label className={labelCls}>
                Tên hiển thị <span className="text-destructive normal-case">*</span>
              </label>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={50}
                className={inputCls} />
              <p className="text-xs text-muted-foreground mt-0.5 text-right">{name.length}/50</p>
            </div>

            <div className="w-[130px] shrink-0">
              <label className={labelCls}>Giới tính</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}>
                <option value="">— Chọn —</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          {/* Quê quán */}
          <div>
            <label className={labelCls}>Quê quán</label>
            <select value={hometown} onChange={e => setHometown(e.target.value)} className={inputCls}>
              <option value="">— Chọn tỉnh / thành phố —</option>
              {VIETNAM_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Row 2: Bio ── */}
      <div>
        <label className={labelCls}>Giới thiệu bản thân</label>
        <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} rows={3}
          placeholder="Viết vài dòng về bản thân..."
          className={`${inputCls} resize-none`} />
        <p className="text-xs text-muted-foreground mt-0.5 text-right">{bio.length}/300</p>
      </div>

      {/* ── Row 3: Social links ── */}
      <div className="border border-border rounded-xl p-4 space-y-3">
        <p className={labelCls}>Mạng xã hội</p>

        {/* Facebook */}
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1877F2]/10 shrink-0">
            <svg className="w-4 h-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </span>
          <input value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/username" className={`${inputCls} flex-1`} />
        </div>

        {/* TikTok */}
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-foreground/5 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.53V6.77a4.85 4.85 0 01-1-.08z"/>
            </svg>
          </span>
          <input value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@username" className={`${inputCls} flex-1`} />
        </div>

        {/* Instagram */}
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-950/30 shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="url(#ig-g)">
              <defs>
                <linearGradient id="ig-g" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433"/>
                  <stop offset="50%" stopColor="#dc2743"/>
                  <stop offset="100%" stopColor="#bc1888"/>
                </linearGradient>
              </defs>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </span>
          <input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/username" className={`${inputCls} flex-1`} />
        </div>
      </div>

      {/* Status + Save */}
      {msg && (
        <p className={`flex items-center gap-1.5 text-sm font-medium ${msg.type === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
          {msg.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0"/> : <AlertCircle className="w-4 h-4 shrink-0"/>}
          {msg.text}
        </p>
      )}

      <button type="submit" disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity text-sm">
        {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </form>
  )
}
