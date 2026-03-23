import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const PER_PAGE = 5000

function sitemapEntry(loc: string, lastmod?: string) {
  return [
    `  <sitemap>`,
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    `  </sitemap>`,
  ].filter(Boolean).join('\n')
}

// GET /sitemap-index.xml  (trỏ tới từ robots.ts)
export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const [storyCount, chapterCount] = await Promise.all([
    prisma.story.count(),
    prisma.chapter.count({ where: { publishStatus: 'APPROVED' } }),
  ])

  const storyPages = Math.ceil(storyCount / PER_PAGE)
  const chapterPages = Math.ceil(chapterCount / PER_PAGE)

  const entries: string[] = [
    // Trang tĩnh
    sitemapEntry(`${BASE_URL}/sitemap/static.xml`, today),
    // Thể loại
    sitemapEntry(`${BASE_URL}/sitemap/genres.xml`, today),
  ]

  // Truyện — phân trang
  for (let i = 0; i < storyPages; i++) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemap/stories/${i}.xml`, today))
  }

  // Chương — phân trang
  for (let i = 0; i < chapterPages; i++) {
    entries.push(sitemapEntry(`${BASE_URL}/sitemap/chapters/${i}.xml`, today))
  }

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries,
    `</sitemapindex>`,
  ].join('\n')

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
