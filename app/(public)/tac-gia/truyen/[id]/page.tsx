'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import StoryForm from '@/components/author/StoryForm'
import { BookOpen, Loader2, Globe2 } from 'lucide-react'

export default function EditAuthorStoryPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [story, setStory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/dang-nhap')
    if (status === 'authenticated') {
      fetch(`/api/author/stories/${params.id}`)
        .then(r => { if (!r.ok) throw new Error(); return r.json() })
        .then(d => { setStory(d); setLoading(false) })
        .catch(() => router.push('/tac-gia'))
    }
  }, [status])

  if (loading || status === 'loading') return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  )

  const ownerType = story?.ownerType === 'TRANSLATOR' ? 'TRANSLATOR' : 'AUTHOR'
  const dashBase = ownerType === 'AUTHOR' ? '/tac-gia' : '/dich-gia'
  const Icon = ownerType === 'AUTHOR' ? BookOpen : Globe2

  const initial = {
    title: story.title,
    description: story.description ?? '',
    coverUrl: story.coverUrl ?? '',
    status: story.status,
    commissionRate: story.commissionRate,
    sourceUrl: story.sourceUrl ?? '',
    sourceAuthor: story.sourceAuthor ?? '',
    sourceLanguage: story.sourceLanguage ?? '',
    genreIds: story.genres?.map((g: any) => g.genreId ?? g.genre?.id) ?? [],
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Icon className="w-7 h-7 text-primary" /> Sửa thông tin truyện
        </h1>
        <p className="text-muted-foreground text-sm mt-1 line-clamp-1">{story.title}</p>
      </div>
      <StoryForm
        mode="edit"
        ownerType={ownerType}
        storyId={params.id}
        initial={initial}
        onSuccess={() => router.push(`${dashBase}/truyen/${params.id}/chuong`)}
      />
    </div>
  )
}
