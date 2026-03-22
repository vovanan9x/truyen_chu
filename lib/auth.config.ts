/**
 * Auth config dùng cho middleware (Edge Runtime) — KHÔNG import Prisma
 * Chỉ decode JWT token, không gọi database
 */
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
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
        if (auth?.user?.role !== 'ADMIN') return Response.redirect(new URL('/', nextUrl))
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
