/**
 * Auth config dùng cho middleware (Edge Runtime) — KHÔNG import Prisma
 * Chỉ decode JWT token, không gọi database
 */
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/dang-nhap' },
  providers: [], // providers được khai báo trong lib/auth.ts server-side
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      // Protect /tai-khoan/*
      if (pathname.startsWith('/tai-khoan')) {
        if (!isLoggedIn) return Response.redirect(new URL('/dang-nhap?callbackUrl=' + pathname, nextUrl))
      }

      // Protect /admin/*
      if (pathname.startsWith('/admin')) {
        if (!isLoggedIn) return Response.redirect(new URL('/dang-nhap', nextUrl))
        const role = auth?.user?.role
        if (role !== 'ADMIN' && role !== 'MOD') return Response.redirect(new URL('/', nextUrl))
        // Các section chỉ ADMIN được phép
        const adminOnlySections = ['cai-dat', 'giao-dich', 'rut-xu', 'nap-xu', 'loi-he-thong', 'nang-cap-tai-khoan']
        if (role === 'MOD') {
          const section = pathname.split('/')[2] ?? ''
          if (adminOnlySections.includes(section)) {
            return Response.redirect(new URL('/admin?forbidden=1', nextUrl))
          }
        }
      }

      // Protect /tac-gia/* — chỉ AUTHOR và ADMIN
      if (pathname.startsWith('/tac-gia')) {
        if (!isLoggedIn) return Response.redirect(new URL('/dang-nhap?callbackUrl=' + pathname, nextUrl))
        const role = auth?.user?.role
        if (role !== 'AUTHOR' && role !== 'ADMIN') return Response.redirect(new URL('/yeu-cau-nang-cap', nextUrl))
      }

      // Protect /dich-gia/* — chỉ TRANSLATOR và ADMIN
      if (pathname.startsWith('/dich-gia')) {
        if (!isLoggedIn) return Response.redirect(new URL('/dang-nhap?callbackUrl=' + pathname, nextUrl))
        const role = auth?.user?.role
        if (role !== 'TRANSLATOR' && role !== 'ADMIN') return Response.redirect(new URL('/yeu-cau-nang-cap', nextUrl))
      }

      return true
    },
    // Chỉ decode JWT, KHÔNG gọi Prisma — Edge Runtime compatible
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
