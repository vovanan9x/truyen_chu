'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ChapterEditor from '@/components/author/ChapterEditor'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'

export default function EditChapterPage({ params }: { params: { id: string; chapterId: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [chapter, setChapter] = useState<any>(null)
  const [story, setStory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/dang-nhap')
    if (status === 'authenticated') {
      Promise.all([
        fetch(`/api/author/stories/${params.id}`).then(r => r.json()),
        fetch(`/api/author/stories/${params.id}/chapters`).then(r => r.json()),
      ]).then(([s, cData]) => {
        setStory(s)
        const ch = cData.chapters?.find((c: any) => c.id === params.chapterId)
        if (!ch) router.push(`/tac-gia/truyen/${params.id}/chuong`)
        else setChapter(ch)
        setLoading(false)
      })
    }
  }, [status])

  if (loading || status === 'loading') return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  )

  const ownerType = story?.ownerType === 'TRANSLATOR' ? 'TRANSLATOR' : 'AUTHOR'
  const dashBase = ownerType === 'TRANSLATOR' ? '/dich-gia' : '/tac-gia'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href={`${dashBase}/truyen/${params.id}/chuong`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Quản lý chương
        </Link>
        <h1 className="text-xl font-black">Sửa chương {chapter?.chapterNum}</h1>
        {chapter?.publishStatus === 'APPROVED' && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
            ⚠️ Sửa chương đã duyệt sẽ reset về Nháp
          </span>
        )}
      </div>
      <ChapterEditor
        storyId={params.id}
        ownerType={ownerType}
        chapterId={params.chapterId}
        initial={{
          chapterNum: chapter?.chapterNum,
          title: chapter?.title ?? '',
          content: chapter?.content ?? '',
          isLocked: chapter?.isLocked,
          coinCost: chapter?.coinCost,
          sourceUrl: chapter?.sourceUrl ?? '',
          publishStatus: chapter?.publishStatus,
        }}
      />
    </div>
  )
}
