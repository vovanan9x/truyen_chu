import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BookOpen, Eye, CheckCircle, Clock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatNumber, slugify } from '@/lib/utils'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  // Find any story by this author slug to get the display name
  const decoded = decodeURIComponent(params.slug)
  const story = await prisma.story.findFirst({
    where: { author: { not: null } },
    select: { author: true },
  })
  // Try to match slug
  const allAuthors = await prisma.story.findMany({
    where: { author: { not: null } },
    select: { author: true },
    distinct: ['author'],
    take: 500,
  })
  const matched = allAuthors.find(s => slugify(s.author!) === decoded)
  const authorName = matched?.author ?? decoded
  return {
    title: `Truyện của ${authorName}`,
    description: `Danh sách truyện của tác giả ${authorName}`,
  }
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ONGOING:   { label: 'Đang ra', color: 'text-blue-500' },
  COMPLETED: { label: 'Hoàn thành', color: 'text-green-500' },
  HIATUS:    { label: 'Tạm dừng', color: 'text-amber-500' },
}

export default async function AuthorStoriesPage({ params }: { params: { slug: string } }) {
  const decoded = decodeURIComponent(params.slug)

  // Find all unique authors and match by slug
  const allAuthors = await prisma.story.findMany({
    where: { author: { not: null } },
    select: { author: true },
    distinct: ['author'],
    take: 1000,
  })
  const matched = allAuthors.find(s => slugify(s.author!) === decoded)
  if (!matched) notFound()

  const authorName = matched.author!

  const stories = await prisma.story.findMany({
    where: { author: authorName },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, title: true, slug: true, coverUrl: true,
      status: true, viewCount: true, author: true,
      _count: { select: { chapters: true } },
      genres: { select: { genre: { select: { name: true, slug: true } } }, take: 3 },
    },
  })

  if (stories.length === 0) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card">
        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {authorName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{authorName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stories.length} truyện • {formatNumber(stories.reduce((sum, s) => sum + s.viewCount, 0))} lượt đọc
          </p>
        </div>
      </div>

      {/* Story Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stories.map(story => {
          const st = STATUS_LABEL[story.status] ?? STATUS_LABEL.ONGOING
          return (
            <Link
              key={story.id}
              href={`/truyen/${story.slug}`}
              className="flex gap-3 p-3 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all group"
            >
              {/* Cover */}
              <div className="flex-shrink-0 w-16 h-24 rounded-xl overflow-hidden bg-muted relative">
                {story.coverUrl ? (
                  <Image src={story.coverUrl} alt={story.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full gradient-primary flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white/60" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 py-0.5 space-y-1.5">
                <h2 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">{story.title}</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className={`font-medium ${st.color}`}>{st.label}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{story._count.chapters} ch.</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(story.viewCount)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {story.genres.map(sg => (
                    <span key={sg.genre.slug} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-medium">
                      {sg.genre.name}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
