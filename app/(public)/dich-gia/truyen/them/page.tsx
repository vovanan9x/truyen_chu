'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import StoryForm from '@/components/author/StoryForm'
import { Globe2 } from 'lucide-react'

export default function NewTranslatorStoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/dang-nhap')
    if (status === 'authenticated' && session.user.role !== 'TRANSLATOR' && session.user.role !== 'ADMIN') {
      router.push('/yeu-cau-nang-cap')
    }
  }, [status])

  if (status === 'loading') return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Globe2 className="w-7 h-7 text-primary" /> Đăng bản dịch mới
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Điền thông tin bộ truyện dịch. Hãy ghi rõ nguồn gốc và tác giả gốc.</p>
      </div>
      <StoryForm mode="create" ownerType="TRANSLATOR" />
    </div>
  )
}
