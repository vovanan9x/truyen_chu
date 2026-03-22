'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.querySelector('[name=email]') as HTMLInputElement).value
    const password = (form.querySelector('[name=password]') as HTMLInputElement).value

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email hoặc mật khẩu không đúng.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Lỗi kết nối, thử lại sau.')
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
      <div>
        <label className="block text-sm font-medium mb-1.5">Email</label>
        <input
          type="email"
          name="email"
          placeholder="email@example.com"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Mật khẩu</label>
        <input
          type="password"
          name="password"
          placeholder="••••••••"
          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
      >
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  )
}
