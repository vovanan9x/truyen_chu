import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSiteSettings, isAdEnabled, getAdCode } from '@/lib/site-settings'
import ReaderWrapper from '@/components/reader/ReaderWrapper'
import ChapterNav from '@/components/reader/ChapterNav'
import ChapterListDrawer from '@/components/reader/ChapterListDrawer'
import ReportButton from '@/components/reader/ReportButton'
import CommentSection from '@/components/story/CommentSection'
import AdBanner from '@/components/ads/AdBanner'

export async function generateMetadata({
  params,
}: {
  params: { slug: string; chapterNum: string }
}): Promise<Metadata> {
  const chapter = await prisma.chapter.findFirst({
    where: {
      chapterNum: parseInt(params.chapterNum, 10),
      story: { slug: params.slug },
    },
    include: { story: true },
  })
  if (!chapter) return { title: 'Không tìm thấy chương' }
  const { buildChapterMeta } = await import('@/lib/seo')
  const meta = await buildChapterMeta(
    { title: chapter.story.title, author: chapter.story.author || '' },
    chapter.chapterNum
  )
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/truyen/${params.slug}/chuong/${params.chapterNum}` },
    openGraph: {
      title: meta.title, description: meta.description, siteName: meta.siteName,
      url: `/truyen/${params.slug}/chuong/${params.chapterNum}`,
    },
    twitter: { card: 'summary', title: meta.title, description: meta.description },
  }
}

export default async function ChapterPage({
  params,
}: {
  params: { slug: string; chapterNum: string }
}) {
  const chapterNum = parseInt(params.chapterNum, 10)
  if (isNaN(chapterNum) || chapterNum < 1) notFound()

  const chapter = await prisma.chapter.findFirst({
    where: {
      chapterNum,
      story: { slug: params.slug },
    },
    include: {
      story: {
        select: {
          id: true,
          title: true,
          slug: true,
          _count: { select: { chapters: true } },
        },
      },
    },
  })

  if (!chapter) notFound()

  const [prev, next, allChapters, chapterComments, siteSettings] = await Promise.all([
    prisma.chapter.findFirst({
      where: { storyId: chapter.storyId, chapterNum: chapterNum - 1 },
      select: { chapterNum: true },
    }),
    prisma.chapter.findFirst({
      where: { storyId: chapter.storyId, chapterNum: chapterNum + 1 },
      select: { chapterNum: true },
    }),
    prisma.chapter.findMany({
      where: { storyId: chapter.storyId },
      orderBy: { chapterNum: 'asc' },
      select: { id: true, chapterNum: true, title: true, isLocked: true },
    }),
    prisma.comment.findMany({
      where: { storyId: chapter.story.id, parentId: null },
      take: 10,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        replies: { take: 3, orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { replies: true } },
      },
    }),
    getSiteSettings(),
  ])

  return (
    <div className="min-h-screen">
      {/* Top nav — ChapterNav + Chapter list drawer trên cùng 1 hàng */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 min-w-0">
            <ChapterNav
              storySlug={chapter.story.slug}
              storyTitle={chapter.story.title}
              currentChapter={chapterNum}
              prevChapter={prev?.chapterNum ?? null}
              nextChapter={next?.chapterNum ?? null}
              totalChapters={chapter.story._count.chapters}
              position="top"
            />
          </div>
          <ChapterListDrawer
            storySlug={chapter.story.slug}
            currentChapterNum={chapterNum}
            chapters={allChapters}
          />
        </div>
      </div>



      {/* Chapter header */}
      <div className="max-w-3xl mx-auto px-4 mt-8 mb-8">
        <div className="text-center space-y-2">
          <Link
            href={`/truyen/${chapter.story.slug}`}
            className="text-sm text-primary hover:underline font-medium"
          >
            {chapter.story.title}
          </Link>
          <h1 className="text-2xl font-bold">
            {chapter.title || `Chương ${chapterNum}`}
          </h1>
          <div className="w-16 h-0.5 mx-auto gradient-primary rounded-full" />
        </div>
      </div>

      {/* Ad Top Reader */}
      {isAdEnabled(siteSettings, 'reader_top') && (
        <div className="max-w-3xl mx-auto px-4 mb-6">
          <AdBanner code={getAdCode(siteSettings, 'reader_top')} />
        </div>
      )}

      {/* Reader content */}
      <div className="max-w-3xl mx-auto px-4 pb-28">
        <ReaderWrapper
          content={chapter.content}
          isLocked={chapter.isLocked}
          coinCost={chapter.coinCost}
          storySlug={chapter.story.slug}
          chapterId={chapter.id}
          storyId={chapter.story.id}
          chapterNum={chapterNum}
        />
      </div>

      {/* Bottom actions */}
      <div className="max-w-3xl mx-auto px-4 mt-6 mb-4 flex justify-center">
        <ReportButton chapterId={chapter.id} />
      </div>

      {/* Ad Bottom Reader */}
      {isAdEnabled(siteSettings, 'reader_bottom') && (
        <div className="max-w-3xl mx-auto px-4 mb-6">
          <AdBanner code={getAdCode(siteSettings, 'reader_bottom')} />
        </div>
      )}

      {/* Comments */}
      <div className="max-w-3xl mx-auto px-4 pb-32">
        <div className="p-6 rounded-2xl border border-border bg-card">
          <CommentSection
            storyId={chapter.story.id}
            initialComments={chapterComments.map(c => ({
              id: c.id,
              content: c.content,
              createdAt: c.createdAt.toISOString(),
              likeCount: c.likeCount,
              isPinned: c.isPinned,
              likedByMe: false,
              user: { id: c.user.id, name: c.user.name, avatar: c.user.avatar, level: (c.user as any).level ?? 1 },
              replies: (c.replies ?? []).map((r: any) => ({
                id: r.id, content: r.content,
                createdAt: r.createdAt.toISOString(),
                likeCount: r.likeCount, isPinned: r.isPinned, likedByMe: false,
                user: { id: r.user.id, name: r.user.name, avatar: r.user.avatar, level: r.user.level ?? 1 },
                replies: [], _count: { replies: 0 },
              })),
              _count: { replies: c._count.replies },
            }))}
          />
        </div>
      </div>

      {/* Sticky bottom nav */}
      <ChapterNav
        storySlug={chapter.story.slug}
        storyTitle={chapter.story.title}
        currentChapter={chapterNum}
        prevChapter={prev?.chapterNum ?? null}
        nextChapter={next?.chapterNum ?? null}
        totalChapters={chapter.story._count.chapters}
        position="bottom"
      />
    </div>
  )
}
