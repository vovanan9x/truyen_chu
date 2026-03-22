import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import EditProfileForm from './EditProfileForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Chỉnh sửa hồ sơ' }

export default async function EditProfilePage() {
  const session = await auth()
  if (!session) redirect('/dang-nhap')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user as any).findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, bio: true, avatar: true,
      gender: true, hometown: true, facebookUrl: true, tiktokUrl: true, instagramUrl: true,
    },
  }) as {
    id: string; name: string | null; email: string; bio: string | null; avatar: string | null;
    gender: string | null; hometown: string | null; facebookUrl: string | null;
    tiktokUrl: string | null; instagramUrl: string | null;
  } | null
  if (!user) redirect('/dang-nhap')

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      <Link href="/tai-khoan" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4"/> Quay lại tài khoản
      </Link>
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
        <h1 className="text-xl font-bold mb-6">Chỉnh sửa hồ sơ</h1>
        <EditProfileForm user={user} />
      </div>
    </div>
  )
}
