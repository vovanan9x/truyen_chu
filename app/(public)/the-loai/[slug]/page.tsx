import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Tag, ChevronRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import StoryGrid from '@/components/story/StoryGrid'
import { StoryCardData } from '@/components/story/StoryCard'

const STORIES_PER_PAGE = 20

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const genre = await prisma.genre.findUnique({ where: { slug: params.slug } })
  if (!genre) return { title: 'Thể loại không tồn tại' }
  return {
    title: `Truyện ${genre.name} - TruyenChu`,
    description: `Đọc truyện ${genre.name} hay nhất, cập nhật nhanh tại TruyenChu.`,
  }
}

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { page?: string; sort?: string }
}) {
  const genre = await prisma.genre.findUnique({
    where: { slug: params.slug },
    include: { _count: { select: { stories: true } } },
  })

  if (!genre) notFound()

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const sort = searchParams.sort ?? 'newest'

  const orderBy =
    sort === 'views' ? { story: { viewCount: 'desc' as const } } :
    sort === 'chapters' ? { story: { updatedAt: 'desc' as const } } :
    { story: { updatedAt: 'desc' as const } }

  const storyGenres = await prisma.storyGenre.findMany({
    where: { genreId: genre.id },
    orderBy,
    take: STORIES_PER_PAGE,
    skip: (page - 1) * STORIES_PER_PAGE,
    include: {
      story: {
        include: {
          genres: { include: { genre: true } },
          _count: { select: { chapters: true } },
        },
      },
    },
  })

  const totalPages = Math.ceil(genre._count.stories / STORIES_PER_PAGE)

  const stories: StoryCardData[] = storyGenres.map((sg) => ({
    id: sg.story.id,
    slug: sg.story.slug,
    title: sg.story.title,
    coverUrl: sg.story.coverUrl,
    author: sg.story.author,
    status: sg.story.status,
    viewCount: sg.story.viewCount,
    updatedAt: sg.story.updatedAt,
    genres: sg.story.genres.map((g) => ({ name: g.genre.name, slug: g.genre.slug })),
    _count: { chapters: sg.story._count.chapters },
  }))

  const sortOptions = [
    { value: 'newest', label: 'Mới cập nhật' },
    { value: 'views', label: 'Lượt đọc' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium flex items-center gap-1.5">
          <Tag className="w-4 h-4" /> {genre.name}
        </span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Truyện{' '}
            <span className="text-gradient">{genre.name}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{genre._count.stories} truyện</p>
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          {sortOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`/the-loai/${params.slug}?sort=${opt.value}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                sort === opt.value
                  ? 'gradient-primary text-white shadow-sm'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có truyện nào trong thể loại này.</p>
        </div>
      ) : (
        <StoryGrid stories={stories} cols={5} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2 flex-wrap">
          {page > 1 && (
            <Link
              href={`/the-loai/${params.slug}?page=${page - 1}&sort=${sort}`}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
            >
              ← Trước
            </Link>
          )}
          {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/the-loai/${params.slug}?page=${p}&sort=${sort}`}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${
                p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'
              }`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link
              href={`/the-loai/${params.slug}?page=${page + 1}&sort=${sort}`}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors"
            >
              Tiếp →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
