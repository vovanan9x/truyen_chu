import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { BookOpen, Plus, Pencil, Lock, Unlock, ChevronRight } from 'lucide-react'
import AdminChapterActions from './AdminChapterActions'

export const metadata: Metadata = { title: 'Quản lý chương' }

export default async function AdminStoryDetailPage({ params }: { params: { id: string } }) {
  const story = await prisma.story.findUnique({
    where: { id: params.id },
    include: {
      genres: { include: { genre: true } },
      chapters: { orderBy: { chapterNum: 'asc' }, select: { id: true, chapterNum: true, title: true, isLocked: true, coinCost: true, wordCount: true, publishedAt: true } },
      _count: { select: { chapters: true } },
    },
  })
  if (!story) notFound()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/admin/truyen" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          ← Truyện
        </Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <h1 className="text-xl font-bold truncate">{story.title}</h1>
        <Link href={`/admin/truyen/${params.id}/chinh-sua`}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
          <Pencil className="w-4 h-4" /> Sửa thông tin
        </Link>
      </div>

      {/* Story info bar */}
      <div className="p-4 rounded-2xl border border-border bg-card flex flex-wrap gap-4 text-sm">
        <img src={story.coverUrl ?? 'https://picsum.photos/seed/default/60/90'} alt={story.title}
          className="w-12 h-16 rounded-lg object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{story.title}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{story.author ?? '—'}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {story.genres.map(sg => (
              <span key={sg.genre.id} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">{sg.genre.name}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-xl font-bold">{story._count.chapters}</p>
            <p className="text-xs text-muted-foreground">Chương</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{story.chapters.filter(c => c.isLocked).length}</p>
            <p className="text-xs text-muted-foreground">VIP</p>
          </div>
        </div>
      </div>

      {/* Chapter list + Actions */}
      <AdminChapterActions storyId={params.id} initialChapters={story.chapters} />
    </div>
  )
}
