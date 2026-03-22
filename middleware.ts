import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

// Dùng authConfig (không có Prisma) để tương thích Edge Runtime
export default NextAuth(authConfig).auth

export const config = {
  matcher: ['/tai-khoan/:path*', '/admin/:path*', '/tac-gia/:path*', '/dich-gia/:path*'],
}
