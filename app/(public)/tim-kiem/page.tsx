import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import StoryGrid from '@/components/story/StoryGrid'
import { StoryCardData } from '@/components/story/StoryCard'

export const metadata: Metadata = {
  title: 'Tìm kiếm truyện',
  description: 'Tìm kiếm truyện chữ theo tên, tác giả, thể loại.',
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams.q?.trim() ?? ''

  const stories = q
    ? await prisma.story.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { author: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 24,
        include: {
          genres: { include: { genre: true } },
          _count: { select: { chapters: true } },
        },
        orderBy: { viewCount: 'desc' },
      })
    : []

  const mapped: StoryCardData[] = stories.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    coverUrl: s.coverUrl,
    author: s.author,
    status: s.status,
    viewCount: s.viewCount,
    updatedAt: s.updatedAt,
    genres: s.genres.map((sg) => ({ name: sg.genre.name, slug: sg.genre.slug })),
    _count: { chapters: s._count.chapters },
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Tìm kiếm</h1>

      <form method="GET" action="/tim-kiem" className="mb-8">
        <div className="flex gap-3 max-w-2xl">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Nhập tên truyện hoặc tác giả..."
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            Tìm
          </button>
        </div>
      </form>

      {q && (
        <p className="text-muted-foreground text-sm mb-4">
          {mapped.length > 0
            ? `Tìm thấy ${mapped.length} truyện cho "${q}"`
            : `Không tìm thấy truyện nào cho "${q}"`}
        </p>
      )}

      {mapped.length > 0 && <StoryGrid stories={mapped} cols={5} />}
    </div>
  )
}
