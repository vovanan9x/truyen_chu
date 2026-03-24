import Image from 'next/image'
import Link from 'next/link'
import { Eye, BookOpen, Lock } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'

export interface StoryCardData {
  id: string
  slug: string
  title: string
  coverUrl: string | null
  author: string | null
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS'
  viewCount: number
  updatedAt: Date
  genres: { name: string; slug: string }[]
  _count?: { chapters: number }
  latestChapter?: number
}

const STATUS_LABELS = {
  ONGOING: { label: 'Đang ra', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  HIATUS: { label: 'Tạm dừng', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
}

export default function StoryCard({ story }: { story: StoryCardData }) {
  const status = STATUS_LABELS[story.status]

  return (
    <Link href={`/truyen/${story.slug}`} className="group block" aria-label={story.title}>
      <div className="story-card-hover rounded-2xl overflow-hidden bg-card border border-border/60 shadow-sm h-full flex flex-col">
        {/* Cover */}
        <div className="relative aspect-[2/3] overflow-hidden bg-muted flex-shrink-0">
          {story.coverUrl ? (
            <Image
              src={story.coverUrl}
              alt={story.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized={story.coverUrl.startsWith('/uploads/') || story.coverUrl.startsWith('/avatars/')}
            />

          ) : (
            <div className="w-full h-full gradient-primary flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/60" />
            </div>
          )}
          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/70 text-white/90">
              {status.label}
            </span>
          </div>
          {/* Chapter count overlay */}
          {story._count && (
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
              <span className="text-white text-xs font-medium">
                {story._count.chapters} chương
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2 flex flex-col gap-1">
          <h3 className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {story.title}
          </h3>
          {/* Meta */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
            <span className="flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" />
              {formatNumber(story.viewCount)}
            </span>
            {story._count && (
              <span className="flex items-center gap-0.5">
                <BookOpen className="w-2.5 h-2.5" />
                {story._count.chapters}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
