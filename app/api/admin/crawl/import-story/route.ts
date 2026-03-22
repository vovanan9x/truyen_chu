// POST /api/admin/crawl/import-story — Import truyện mới từ URL (C)
// Tự động: fetch info, tạo Story trong DB, tạo CrawlSchedule
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAdapterWithDbConfig, fetchUrl, downloadAndSaveCover } from '@/lib/crawl-adapters'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

function uniqueSlug(base: string, suffix = 0): string {
  return suffix === 0 ? base : `${base}-${suffix}`
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { url, intervalMinutes = 60, autoSchedule = true } = await req.json()
  if (!url) return NextResponse.json({ error: 'Thiếu URL' }, { status: 400 })

  try {
    const { adapter } = await getAdapterWithDbConfig(url)
    const html = await fetchUrl(url, 20000)
    const info = adapter.fetchStoryInfo(url, html)

    if (!info.title) {
      return NextResponse.json({ error: 'Không thể lấy thông tin truyện từ URL này' }, { status: 400 })
    }

    // Tạo slug duy nhất
    const baseSlug = slugify(info.title) || slugify(url.split('/').filter(Boolean).pop() ?? 'truyen')
    let slug = uniqueSlug(baseSlug)
    let attempt = 1
    while (await prisma.story.findUnique({ where: { slug } })) {
      slug = uniqueSlug(baseSlug, attempt++)
    }

    // Tải ảnh bìa về local
    let coverUrl = info.coverUrl || null
    if (coverUrl) {
      const localCover = await downloadAndSaveCover(coverUrl)
      if (localCover) coverUrl = localCover
    }

    // Upsert genres
    const genreIds: string[] = []
    for (const genreName of info.genres.slice(0, 10)) {
      const genreSlug = slugify(genreName)
      if (!genreSlug) continue
      const genre = await prisma.genre.upsert({
        where: { slug: genreSlug },
        create: { name: genreName, slug: genreSlug },
        update: {},
      })
      genreIds.push(genre.id)
    }

    // Tạo Story
    const story = await prisma.story.create({
      data: {
        title: info.title,
        slug,
        author: info.author || null,
        description: info.description || null,
        coverUrl,
        sourceUrl: url,
        status: info.status as any ?? 'ONGOING',
        genres: { create: genreIds.map(id => ({ genreId: id })) },
      },
    })

    // Tạo CrawlSchedule nếu yêu cầu
    let schedule = null
    if (autoSchedule) {
      schedule = await prisma.crawlSchedule.create({
        data: {
          storyId: story.id,
          sourceUrl: url,
          intervalMinutes,
          isActive: true,
          lastChapterNum: 0,
          nextRunAt: new Date(Date.now() + 5000), // chạy sau 5 giây
        },
      })
    }

    return NextResponse.json({
      ok: true,
      story: { id: story.id, title: story.title, slug: story.slug },
      scheduleId: schedule?.id ?? null,
      adapterName: adapter.name,
    })
  } catch (e: any) {
    console.error('[import-story]', e)
    return NextResponse.json({ error: e?.message ?? 'Lỗi không xác định' }, { status: 500 })
  }
}
