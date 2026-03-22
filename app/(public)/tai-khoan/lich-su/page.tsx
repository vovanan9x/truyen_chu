import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, ChevronRight, BookOpen } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Lịch sử đọc' }

const PER_PAGE = 20

export default async function ReadingHistoryPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const session = await auth()
  if (!session) redirect('/dang-nhap')

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const [history, total] = await Promise.all([
    prisma.readingHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      include: {
        story: {
          include: {
            genres: { include: { genre: true } },
            _count: { select: { chapters: true } },
          },
        },
        chapter: { select: { chapterNum: true } },
      },
    }),
    prisma.readingHistory.count({ where: { userId: session.user.id } }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-6 rounded-full gradient-primary" />
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Lịch sử đọc
        </h1>
        <span className="text-sm text-muted-foreground">({total} truyện)</span>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-14 h-14 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Bạn chưa đọc truyện nào.</p>
          <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
            Khám phá truyện ngay →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <div
              key={h.storyId}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent/50 transition-all group"
            >
              {/* Cover */}
              <Link href={`/truyen/${h.story.slug}`} className="flex-shrink-0">
                <div className="w-14 h-20 rounded-lg overflow-hidden bg-muted">
                  {h.story.coverUrl ? (
                    <img src={h.story.coverUrl} alt={h.story.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full gradient-primary opacity-40 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/truyen/${h.story.slug}`}>
                  <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {h.story.title}
                  </h3>
                </Link>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {h.story.genres.slice(0, 3).map((sg) => (
                    <span
                      key={sg.genre.slug}
                      className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground"
                    >
                      {sg.genre.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Đọc đến chương {h.chapter?.chapterNum ?? 1} • Cập nhật {formatDate(h.updatedAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <Link
                  href={`/truyen/${h.story.slug}/chuong/${h.chapter?.chapterNum ?? 1}`}
                  className="px-3 py-1.5 rounded-lg gradient-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Đọc tiếp
                </Link>
                <span className="text-xs text-muted-foreground">{h.story._count.chapters} chương</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/tai-khoan/lich-su?page=${page - 1}`} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">← Trước</Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/tai-khoan/lich-su?page=${p}`}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={`/tai-khoan/lich-su?page=${page + 1}`} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">Tiếp →</Link>
          )}
        </div>
      )}
    </div>
  )
}
