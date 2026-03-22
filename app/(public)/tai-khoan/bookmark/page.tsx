import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookMarked, BookOpen, ChevronRight } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate, formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Truyện theo dõi' }

const PER_PAGE = 20

export default async function BookmarkPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await auth()
  if (!session) redirect('/dang-nhap')

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const [bookmarks, total] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      include: {
        story: {
          include: {
            genres: { include: { genre: true } },
            _count: { select: { chapters: true } },
          },
        },
      },
    }),
    prisma.bookmark.count({ where: { userId: session.user.id } }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-6 rounded-full gradient-primary" />
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary" /> Truyện theo dõi
        </h1>
        <span className="text-sm text-muted-foreground">({total} truyện)</span>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookMarked className="w-14 h-14 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Bạn chưa theo dõi truyện nào.</p>
          <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
            Tìm truyện hay →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bookmarks.map(({ story, createdAt }) => (
            <div
              key={story.id}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent/50 transition-all group"
            >
              <Link href={`/truyen/${story.slug}`} className="flex-shrink-0">
                <div className="w-14 h-20 rounded-lg overflow-hidden bg-muted">
                  {story.coverUrl ? (
                    <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full gradient-primary opacity-40 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/truyen/${story.slug}`}>
                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {story.title}
                  </h3>
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  {story._count.chapters} chương • {formatNumber(story.viewCount)} lượt đọc
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {story.genres.slice(0, 2).map((sg) => (
                    <span key={sg.genre.slug} className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                      {sg.genre.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Theo dõi {formatDate(createdAt)}</p>
              </div>

              <Link
                href={`/truyen/${story.slug}`}
                className="self-center flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/tai-khoan/bookmark?page=${page - 1}`} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">← Trước</Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/tai-khoan/bookmark?page=${p}`} className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>{p}</Link>
          ))}
          {page < totalPages && (
            <Link href={`/tai-khoan/bookmark?page=${page + 1}`} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">Tiếp →</Link>
          )}
        </div>
      )}
    </div>
  )
}
