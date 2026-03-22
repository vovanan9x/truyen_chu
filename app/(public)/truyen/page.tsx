import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import StoryGrid from '@/components/story/StoryGrid'
import StoryFilters from '@/components/story/StoryFilters'
import { StoryCardData } from '@/components/story/StoryCard'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Danh sách truyện',
  description: 'Tổng hợp truyện chữ hay nhất, cập nhật mới nhất. Lọc theo thể loại, trạng thái và sắp xếp theo nhiều tiêu chí.',
}

const PAGE_SIZE = 24

interface SearchParams {
  page?: string
  sort?: string
  status?: string
  genre?: string
}

export default async function StoryListPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const sort = searchParams.sort ?? 'newest'
  const status = searchParams.status as 'ONGOING' | 'COMPLETED' | 'HIATUS' | undefined
  const genreSlug = searchParams.genre

  type WhereInput = { status?: 'ONGOING' | 'COMPLETED' | 'HIATUS'; genres?: { some: { genre: { slug: string } } } }
  type OrderByInput = { viewCount?: 'asc' | 'desc'; rating?: 'asc' | 'desc'; updatedAt?: 'asc' | 'desc' }

  const where: WhereInput = {}
  if (status) where.status = status
  if (genreSlug) {
    where.genres = { some: { genre: { slug: genreSlug } } }
  }

  const orderBy: OrderByInput =
    sort === 'views'
      ? { viewCount: 'desc' }
      : sort === 'rating'
      ? { rating: 'desc' }
      : { updatedAt: 'desc' }

  const [stories, total, genres] = await Promise.all([
    prisma.story.findMany({
      where,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      orderBy,
      include: {
        genres: { include: { genre: true } },
        _count: { select: { chapters: true } },
      },
    }),
    prisma.story.count({ where }),
    prisma.genre.findMany({ orderBy: { stories: { _count: 'desc' } } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const mapped: StoryCardData[] = stories.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    coverUrl: s.coverUrl,
    author: s.author,
    status: s.status,
    viewCount: s.viewCount,
    updatedAt: s.updatedAt,
    genres: s.genres.map((sg: { genre: { name: string; slug: string } }) => ({ name: sg.genre.name, slug: sg.genre.slug })),
    _count: { chapters: s._count.chapters },
  }))

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (sort !== 'newest') params.set('sort', sort)
    if (status) params.set('status', status)
    if (genreSlug) params.set('genre', genreSlug)
    const qs = params.toString()
    return `/truyen${qs ? '?' + qs : ''}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Danh sách truyện</h1>
        <p className="text-muted-foreground text-sm">
          {total.toLocaleString('vi-VN')} truyện
        </p>
      </div>

      <StoryFilters genres={genres} currentSort={sort} currentStatus={status} currentGenre={genreSlug} />

      <div className="mt-6">
        <StoryGrid stories={mapped} cols={6} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildPageUrl(page - 1)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Trước
            </Link>
          )}

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1
              if (page > 3 && totalPages > 5) p = page - 2 + i
              if (p > totalPages) return null
              return (
                <Link
                  key={p}
                  href={buildPageUrl(p)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                    p === page
                      ? 'gradient-primary text-white shadow-sm'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  {p}
                </Link>
              )
            })}
          </div>

          {page < totalPages && (
            <Link
              href={buildPageUrl(page + 1)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium"
            >
              Sau <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
