import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatNumber } from '@/lib/utils'
import { TrendingUp, Eye, Star, BookMarked } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Bảng xếp hạng truyện',
  description: 'Top truyện được đọc nhiều nhất, đánh giá cao nhất trên TruyenChu',
}

type SortType = 'views' | 'rating' | 'bookmarks'

export default async function RankingPage({ searchParams }: { searchParams: { sort?: string } }) {
  const sort = (searchParams.sort as SortType) ?? 'views'

  const [byViews, byRating, byBookmarks] = await Promise.all([
    prisma.story.findMany({
      take: 20, orderBy: { viewCount: 'desc' },
      select: { id: true, title: true, slug: true, coverUrl: true, author: true, viewCount: true, rating: true, ratingCount: true, status: true,
        _count: { select: { chapters: true, bookmarks: true } },
        genres: { take: 2, include: { genre: { select: { name: true } } } },
      },
    }),
    prisma.story.findMany({
      take: 20, orderBy: { rating: 'desc' }, where: { ratingCount: { gt: 0 } },
      select: { id: true, title: true, slug: true, coverUrl: true, author: true, viewCount: true, rating: true, ratingCount: true, status: true,
        _count: { select: { chapters: true, bookmarks: true } },
        genres: { take: 2, include: { genre: { select: { name: true } } } },
      },
    }),
    prisma.story.findMany({
      take: 20, orderBy: { bookmarks: { _count: 'desc' } },
      select: { id: true, title: true, slug: true, coverUrl: true, author: true, viewCount: true, rating: true, ratingCount: true, status: true,
        _count: { select: { chapters: true, bookmarks: true } },
        genres: { take: 2, include: { genre: { select: { name: true } } } },
      },
    }),
  ])

  const tabs: { value: SortType; label: string; icon: any; data: typeof byViews }[] = [
    { value: 'views', label: 'Xem nhiều nhất', icon: Eye, data: byViews },
    { value: 'rating', label: 'Đánh giá cao', icon: Star, data: byRating },
    { value: 'bookmarks', label: 'Theo dõi nhiều', icon: BookMarked, data: byBookmarks },
  ]

  const active = tabs.find(t => t.value === sort) ?? tabs[0]

  const statusLabel: Record<string, string> = { ONGOING: 'Đang ra', COMPLETED: 'Hoàn thành', HIATUS: 'Tạm dừng' }
  const statusColor: Record<string, string> = { ONGOING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', HIATUS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Bảng xếp hạng</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <Link key={tab.value} href={`/bang-xep-hang?sort=${tab.value}`}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                sort === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Story list */}
      <div className="space-y-3">
        {active.data.map((story, idx) => (
          <Link key={story.id} href={`/truyen/${story.slug}`}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
            {/* Rank number */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
              idx === 0 ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/30'
              : idx === 1 ? 'bg-slate-300 text-slate-700'
              : idx === 2 ? 'bg-amber-700 text-white'
              : 'bg-muted text-muted-foreground'
            }`}>
              {idx + 1}
            </div>

            <img src={story.coverUrl ?? 'https://picsum.photos/seed/' + story.slug + '/60/90'}
              alt={story.title} className="w-12 h-16 rounded-lg object-cover flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="font-semibold group-hover:text-primary transition-colors truncate">{story.title}</p>
              <p className="text-sm text-muted-foreground truncate">{story.author ?? 'Đang cập nhật'}</p>
              <div className="flex items-center flex-wrap gap-2 mt-1.5">
                {story.genres.map(sg => (
                  <span key={sg.genre.name} className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs">{sg.genre.name}</span>
                ))}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[story.status]}`}>{statusLabel[story.status]}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 text-sm flex-shrink-0">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                <span>{formatNumber(story.viewCount)}</span>
              </div>
              {story.rating > 0 && (
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{story.rating.toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <BookMarked className="w-3.5 h-3.5" />
                <span>{formatNumber(story._count.bookmarks)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
