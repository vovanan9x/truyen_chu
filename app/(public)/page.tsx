import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, TrendingUp, Clock, Tag } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import FeaturedCarousel from '@/components/story/FeaturedCarousel'
import StoryGrid from '@/components/story/StoryGrid'
import { StoryCardData } from '@/components/story/StoryCard'
import { buildHomeMeta } from '@/lib/seo'
import { unstable_noStore as noStore } from 'next/cache'

// Luôn fetch dữ liệu mới nhất — không cache trang chủ (cần thấy truyện/chương mới ngay sau khi crawl)
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const meta = await buildHomeMeta()
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'website',
      siteName: meta.siteName,
      ...(meta.ogImage ? { images: [{ url: meta.ogImage }] } : {}),
    },
    twitter: { card: 'summary_large_image', title: meta.title, description: meta.description },
  }
}

async function getFeaturedStories() {
  return prisma.story.findMany({
    where: { isFeatured: true },
    take: 5,
    include: {
      genres: { include: { genre: true } },
      _count: { select: { chapters: true } },
    },
    orderBy: { viewCount: 'desc' },
  })
}

async function getRecentlyUpdated() {
  return prisma.story.findMany({
    take: 20,
    orderBy: { updatedAt: 'desc' },
    include: {
      genres: { include: { genre: true } },
      _count: { select: { chapters: true } },
    },
  })
}

async function getPopularStories() {
  return prisma.story.findMany({
    take: 20,
    orderBy: { viewCount: 'desc' },
    include: {
      genres: { include: { genre: true } },
      _count: { select: { chapters: true } },
    },
  })
}

async function getAllGenres() {
  return prisma.genre.findMany({
    include: { _count: { select: { stories: true } } },
    orderBy: { stories: { _count: 'desc' } },
  })
}

function mapStory(s: Awaited<ReturnType<typeof getRecentlyUpdated>>[number]): StoryCardData {
  return {
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
  }
}

export default async function HomePage() {
  noStore()
  const [featured, recent, popular, genres] = await Promise.all([
    getFeaturedStories(),
    getRecentlyUpdated(),
    getPopularStories(),
    getAllGenres(),
  ])

  const featuredMapped = featured.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description,
    coverUrl: s.coverUrl,
    author: s.author,
    viewCount: s.viewCount,
    genres: s.genres.map((sg) => ({ name: sg.genre.name, slug: sg.genre.slug })),
    _count: { chapters: s._count.chapters },
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-14">
      {/* Featured Carousel */}
      <section>
        <FeaturedCarousel stories={featuredMapped} />
      </section>

      {/* Recently Updated */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full gradient-primary" />
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Mới cập nhật
            </h2>
          </div>
          <Link
            href="/truyen?sort=newest"
            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <StoryGrid stories={recent.map(mapStory)} cols={6} />
      </section>

      {/* Popular */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full gradient-primary" />
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Đề xuất
            </h2>
          </div>
          <Link
            href="/truyen?sort=views"
            className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
          >
            Xem tất cả <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <StoryGrid stories={popular.map(mapStory)} cols={6} />
      </section>

      {/* Genre Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 rounded-full gradient-primary" />
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Thể loại
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
          {genres.map((g) => (
            <Link
              key={g.slug}
              href={`/the-loai/${g.slug}`}
              className="group flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-accent transition-all duration-200 story-card-hover"
            >
              <span className="font-medium text-sm group-hover:text-primary transition-colors">{g.name}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {g._count.stories}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
