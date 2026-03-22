import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập để theo dõi truyện, mở khoá chương VIP.',
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Đăng nhập</h1>
          <p className="text-muted-foreground text-sm mt-2">Chào mừng bạn trở lại!</p>
        </div>

        <Suspense fallback={<div className="h-48 rounded-2xl border border-border bg-card animate-pulse" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Chưa có tài khoản?{' '}
          <Link href="/dang-ky" className="text-primary hover:underline font-medium">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}
