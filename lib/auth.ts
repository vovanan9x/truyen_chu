import NextAuth, { DefaultSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authConfig } from '@/lib/auth.config'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 ngày
    updateAge: 24 * 60 * 60,   // gia hạn mỗi 1 ngày khi user còn active
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials)

        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Lần đầu đăng nhập
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.roleUpdatedAt = Date.now()
      } else if (token.id) {
        // Refresh role từ DB mỗi 60 giây — chỉ chạy server-side, KHÔNG chạy ở Edge
        const now = Date.now()
        const lastCheck = (token.roleUpdatedAt as number) ?? 0
        if (now - lastCheck > 60_000) {
          try {
            const freshUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { role: true },
            })
            if (freshUser) token.role = freshUser.role
          } catch {
            // Ignore nếu chạy ở Edge (prisma không available)
          }
          token.roleUpdatedAt = now
        }
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
})
