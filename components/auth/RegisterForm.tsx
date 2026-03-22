'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const name = (form.querySelector('[name=name]') as HTMLInputElement).value
    const email = (form.querySelector('[name=email]') as HTMLInputElement).value
    const password = (form.querySelector('[name=password]') as HTMLInputElement).value
    const confirmPassword = (form.querySelector('[name=confirmPassword]') as HTMLInputElement).value
    const gender = (form.querySelector('[name=gender]') as HTMLSelectElement).value
    const hometown = (form.querySelector('[name=hometown]') as HTMLInputElement).value

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      setLoading(false)
      return
    }

    try {
      // 1. Tạo tài khoản
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Đăng ký thất bại')
        return
      }

      // 2. Đăng nhập tự động
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.ok && (gender || hometown)) {
        // 3. Cập nhật thông tin bổ sung nếu có
        await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(gender ? { gender } : {}),
            ...(hometown ? { hometown } : {}),
          }),
        })
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Lỗi kết nối, thử lại sau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl border border-border bg-card shadow-sm">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      {/* Tên hiển thị */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Tên hiển thị <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          name="name"
          placeholder="Nguyễn Văn A"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          required
          minLength={2}
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Email <span className="text-destructive">*</span>
        </label>
        <input
          type="email"
          name="email"
          placeholder="email@example.com"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          required
        />
      </div>

      {/* Mật khẩu */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Mật khẩu <span className="text-destructive">*</span>
        </label>
        <input
          type="password"
          name="password"
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          required
          minLength={6}
        />
      </div>

      {/* Xác nhận mật khẩu */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Xác nhận mật khẩu <span className="text-destructive">*</span>
        </label>
        <input
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          required
          minLength={6}
        />
      </div>

      {/* Giới tính + Quê quán - 2 cột */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Giới tính</label>
          <select
            name="gender"
            defaultValue=""
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          >
            <option value="">Chọn...</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Quê quán</label>
          <input
            type="text"
            name="hometown"
            placeholder="Hà Nội, TP.HCM..."
            maxLength={100}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
      >
        {loading ? 'Đang đăng ký...' : 'Đăng ký'}
      </button>
    </form>
  )
}
