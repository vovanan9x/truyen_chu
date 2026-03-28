import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import StoryGrid from '@/components/story/StoryGrid'
import { StoryCardData } from '@/components/story/StoryCard'
import SearchSuggestions from '@/components/search/SearchSuggestions'

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
    ? await prisma.$queryRaw<any[]>`
        SELECT
          s.id, s.slug, s.title, s.cover_url AS "coverUrl",
          s.author, s.status, s.view_count AS "viewCount", s.updated_at AS "updatedAt",
          GREATEST(
            similarity(s.title, ${q}),
            similarity(COALESCE(s.author,''), ${q})
          ) AS score
        FROM stories s
        WHERE
          s.title ILIKE ${'%' + q + '%'}
          OR s.author ILIKE ${'%' + q + '%'}
          OR similarity(s.title, ${q}) > 0.15
          OR similarity(COALESCE(s.author,''), ${q}) > 0.15
        ORDER BY score DESC, s.view_count DESC
        LIMIT 24
      `
    : []

  // For raw query results, fetch genres separately
  const storyIds: string[] = stories.map((s: any) => s.id)
  const genreMap = new Map<string, { name: string; slug: string }[]>()
  const chapterCountMap = new Map<string, number>()

  if (storyIds.length > 0) {
    const storyGenres = await prisma.storyGenre.findMany({
      where: { storyId: { in: storyIds } },
      include: { genre: { select: { name: true, slug: true } } },
    })
    for (const sg of storyGenres) {
      if (!genreMap.has(sg.storyId)) genreMap.set(sg.storyId, [])
      genreMap.get(sg.storyId)!.push({ name: sg.genre.name, slug: sg.genre.slug })
    }
    const chapterCounts = await prisma.chapter.groupBy({
      by: ['storyId'],
      where: { storyId: { in: storyIds } },
      _count: { id: true },
    })
    for (const c of chapterCounts) chapterCountMap.set(c.storyId, c._count.id)
  }

  const mapped: StoryCardData[] = stories.map((s: any) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    coverUrl: s.coverUrl,
    author: s.author,
    status: s.status,
    viewCount: Number(s.viewCount ?? 0),
    updatedAt: s.updatedAt,
    genres: genreMap.get(s.id) ?? [],
    _count: { chapters: chapterCountMap.get(s.id) ?? 0 },
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Tìm kiếm</h1>

      <form method="GET" action="/tim-kiem" className="mb-6">
        <div className="flex gap-3 max-w-2xl">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Nhập tên truyện hoặc tác giả..."
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            autoComplete="off"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            Tìm
          </button>
        </div>
      </form>

      {/* Popular keyword suggestions + auto-logs current query */}
      <SearchSuggestions currentQuery={q || undefined} />

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
