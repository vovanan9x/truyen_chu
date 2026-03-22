'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ChapterEditor from '@/components/author/ChapterEditor'
import Link from 'next/link'
import { ChevronLeft, PlusCircle } from 'lucide-react'

export default function AddChapterPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/dang-nhap')
  }, [status])

  if (status === 'loading') return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  const ownerType = session?.user?.role === 'TRANSLATOR' ? 'TRANSLATOR' : 'AUTHOR'
  const dashBase = ownerType === 'TRANSLATOR' ? '/dich-gia' : '/tac-gia'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`${dashBase}/truyen/${params.id}/chuong`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Quản lý chương
        </Link>
        <h1 className="text-xl font-black flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-primary" /> Thêm chương mới
        </h1>
      </div>
      <ChapterEditor storyId={params.id} ownerType={ownerType} />
    </div>
  )
}
