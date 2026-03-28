import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, Eye, CheckCircle, Clock, AlertCircle, Lock } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSiteSettings, isAdEnabled, getAdCode } from '@/lib/site-settings'
import { formatNumber, formatDate, slugify } from '@/lib/utils'
import BookmarkButton from '@/components/story/BookmarkButton'
import CommentSection from '@/components/story/CommentSection'
import RatingStars from '@/components/story/RatingStars'
import ShareButtons from '@/components/story/ShareButtons'
import ReadingListButton from '@/components/story/ReadingListButton'
import ChapterListClient from '@/components/story/ChapterListClient'
import ExpandableDescription from '@/components/story/ExpandableDescription'
import AdBanner from '@/components/ads/AdBanner'
import ViewTracker from '@/components/story/ViewTracker'
import StoryCard from '@/components/story/StoryCard'

// Single reusable query for story lookup — avoids double DB hit between generateMetadata and page
async function getStoryBySlug(slug: string) {
  return prisma.story.findUnique({
    where: { slug },
    include: {
      genres: { include: { genre: true } },
      _count: { select: { chapters: true } },
    },
  })
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const story = await getStoryBySlug(params.slug)
  if (!story) return { title: 'Không tìm thấy truyện' }
  const { buildStoryMeta } = await import('@/lib/seo')
  const meta = await buildStoryMeta({ ...story, author: story.author ?? '' }, story._count.chapters)
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/truyen/${story.slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'book',
      siteName: meta.siteName,
      url: `/truyen/${story.slug}`,
      images: meta.ogImage ? [{ url: meta.ogImage, width: 300, height: 400, alt: story.title }] : [],
    },
    twitter: { card: 'summary_large_image', title: meta.title, description: meta.description, images: meta.ogImage ? [meta.ogImage] : [] },
  }
}

const STATUS_INFO = {
  ONGOING: { label: 'Đang ra', icon: Clock, color: 'text-green-500' },
  COMPLETED: { label: 'Hoàn thành', icon: CheckCircle, color: 'text-blue-500' },
  HIATUS: { label: 'Tạm dừng', icon: AlertCircle, color: 'text-yellow-500' },
}


export default async function StoryDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  // force-dynamic (module-level) already disables caching — noStore() not needed
  const story = await getStoryBySlug(params.slug)

  if (!story) notFound()

  // Related stories: same genres, exclude self, sorted by viewCount
  const genreIds = story.genres.map(g => g.genre.id)

  const [chapters, comments, siteSettings, relatedStories] = await Promise.all([
    prisma.chapter.findMany({
      where: { storyId: story.id },
      orderBy: { chapterNum: 'desc' },
      take: 50,
      select: { id: true, chapterNum: true, title: true, isLocked: true, publishedAt: true },
    }),
    prisma.comment.findMany({
      where: { storyId: story.id, parentId: null },
      take: 15,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        replies: { take: 3, orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { replies: true } },
      },
    }),
    getSiteSettings(),
    genreIds.length > 0
      ? prisma.story.findMany({
          where: {
            id: { not: story.id },
            genres: { some: { genreId: { in: genreIds } } },
          },
          take: 6,
          orderBy: { viewCount: 'desc' },
          include: {
            genres: { include: { genre: true } },
            _count: { select: { chapters: true } },
          },
        })
      : Promise.resolve([]),
  ])
  const status = STATUS_INFO[story.status]
  const StatusIcon = status.icon

  // View count handled client-side via ViewTracker (cookie-gated, 1hr debounce)

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <ViewTracker storyId={story.id} />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-5 sm:space-y-8">
          {/* Hero Section — side-by-side on ALL sizes */}
          <div className="flex flex-row gap-4 sm:gap-6">
            {/* Cover — smaller on mobile */}
            <div className="flex-shrink-0">
              <div className="relative w-28 h-40 sm:w-44 sm:h-64 md:w-48 md:h-72 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl">
                {story.coverUrl ? (
                  <Image src={story.coverUrl} alt={story.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full gradient-primary flex items-center justify-center">
                    <BookOpen className="w-10 h-10 sm:w-16 sm:h-16 text-white/60" />
                  </div>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0 space-y-2 sm:space-y-4">
              <div>
                <h1 className="text-base sm:text-2xl md:text-3xl font-bold leading-tight line-clamp-3 sm:line-clamp-none">{story.title}</h1>
                {story.author && (
                  <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
                    Tác giả:{' '}
                    <Link href={`/tac-gia/${encodeURIComponent(slugify(story.author))}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {story.author}
                    </Link>
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                <span className={`flex items-center gap-1 sm:gap-1.5 font-medium ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {status.label}
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {formatNumber(story.viewCount)}
                </span>
                <span className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {story._count.chapters} ch.
                </span>
              </div>

              {/* Genres — hidden on mobile to save space, shown on sm+ */}
              <div className="hidden sm:flex flex-wrap gap-2">
                {story.genres.map((sg) => (
                  <Link
                    key={sg.genre.slug}
                    href={`/the-loai/${sg.genre.slug}`}
                    className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {sg.genre.name}
                  </Link>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-1.5 sm:gap-3 pt-1 sm:pt-2">
                {chapters[0] && (
                  <Link
                    href={`/truyen/${story.slug}/chuong/1`}
                    className="px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-opacity shadow-sm text-xs sm:text-sm flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Đọc từ đầu
                  </Link>
                )}
                <BookmarkButton storyId={story.id} />
                <ReadingListButton storyId={story.id} />
                <ShareButtons slug={story.slug} title={story.title} />
              </div>

              {/* Rating */}
              <div className="pt-2 sm:pt-3 border-t border-border/50">
                <RatingStars storyId={story.id} initialRating={story.rating} ratingCount={story.ratingCount} />
              </div>
            </div>
          </div>

          {/* Genres on mobile — shown below hero */}
          <div className="flex sm:hidden flex-wrap gap-1.5">
            {story.genres.map((sg) => (
              <Link
                key={sg.genre.slug}
                href={`/the-loai/${sg.genre.slug}`}
                className="px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {sg.genre.name}
              </Link>
            ))}
          </div>

          {/* Description */}
          {story.description && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full gradient-primary" />
                <h2 className="text-lg font-bold">Giới thiệu</h2>
              </div>
              <ExpandableDescription text={story.description} />
            </div>
          )}

          {/* Ad story detail */}
          {isAdEnabled(siteSettings, 'story_detail') && (
            <AdBanner code={getAdCode(siteSettings, 'story_detail')} className="rounded-2xl overflow-hidden" />
          )}

          {/* Chapter list — client component xử lý sort + search */}
          <ChapterListClient
            chapters={chapters.map(ch => ({ ...ch, publishedAt: ch.publishedAt?.toISOString() ?? null }))}
            storySlug={story.slug}
            totalChapters={story._count.chapters}
          />

          {/* Comments */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 rounded-full gradient-primary" />
              <h2 className="text-lg font-bold">Bình luận</h2>
            </div>
            <CommentSection
              storyId={story.id}
              initialComments={comments.map((c) => ({
                id: c.id,
                content: c.content,
                createdAt: c.createdAt.toISOString(),
                likeCount: c.likeCount,
                isPinned: c.isPinned,
                likedByMe: false,
                user: { id: c.user.id, name: c.user.name, avatar: c.user.avatar, level: (c.user as any).level ?? 1 },
                replies: (c.replies ?? []).map(r => ({
                  id: r.id, content: r.content,
                  createdAt: r.createdAt.toISOString(),
                  likeCount: r.likeCount, isPinned: r.isPinned, likedByMe: false,
                  user: { id: (r.user as any).id, name: (r.user as any).name, avatar: (r.user as any).avatar, level: (r.user as any).level ?? 1 },
                  replies: [], _count: { replies: 0 },
                })),
                _count: { replies: c._count.replies },
              }))}
            />
          </div>

          {/* Related Stories */}
          {relatedStories.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full gradient-primary" />
                <h2 className="text-lg font-bold">Truyện liên quan</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {relatedStories.map((s) => (
                  <StoryCard
                    key={s.id}
                    story={{
                      id: s.id, slug: s.slug, title: s.title, coverUrl: s.coverUrl,
                      author: s.author, status: s.status, viewCount: s.viewCount,
                      updatedAt: s.updatedAt,
                      genres: s.genres.map(sg => ({ name: sg.genre.name, slug: sg.genre.slug })),
                      _count: { chapters: s._count.chapters },
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Thông tin</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tác giả</span>
                <span className="font-medium">{story.author ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className={`font-medium ${status.color}`}>{status.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Số chương</span>
                <span className="font-medium">{story._count.chapters}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lượt đọc</span>
                <span className="font-medium">{formatNumber(story.viewCount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cập nhật</span>
                <span className="font-medium">{formatDate(story.updatedAt)}</span>
              </div>
            </div>
          </div>
          {/* Sidebar Ad */}
          {isAdEnabled(siteSettings, 'sidebar') && (
            <AdBanner code={getAdCode(siteSettings, 'sidebar')} className="rounded-2xl overflow-hidden" />
          )}
        </aside>
      </div>
    </div>
  )
}
