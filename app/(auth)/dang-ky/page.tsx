import { Metadata } from 'next'
import Link from 'next/link'
import RegisterForm from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tạo tài khoản miễn phí để theo dõi truyện và mở khoá chương VIP.',
}

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Đăng ký</h1>
          <p className="text-muted-foreground text-sm mt-2">Tạo tài khoản miễn phí ngay hôm nay!</p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-muted-foreground mt-4">
          Đã có tài khoản?{' '}
          <Link href="/dang-nhap" className="text-primary hover:underline font-medium">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
