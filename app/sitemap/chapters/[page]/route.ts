import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const PER_PAGE = 5000

function urlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: number) {
  return [
    `  <url>`,
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority !== undefined ? `    <priority>${priority.toFixed(1)}</priority>` : '',
    `  </url>`,
  ].filter(Boolean).join('\n')
}

// GET /sitemap/chapters/[page].xml
export async function GET(_req: Request, { params }: { params: { page: string } }) {
  const page = Math.max(0, parseInt(params.page) || 0)

  const chapters = await prisma.chapter.findMany({
    skip: page * PER_PAGE,
    take: PER_PAGE,
    where: { publishStatus: 'APPROVED' },
    orderBy: { publishedAt: 'desc' },
    select: {
      chapterNum: true,
      publishedAt: true,
      story: { select: { slug: true } },
    },
  })

  if (chapters.length === 0) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const urls = chapters.map(c =>
    urlEntry(
      `${BASE_URL}/truyen/${c.story.slug}/chuong/${c.chapterNum}`,
      c.publishedAt.toISOString().split('T')[0],
      'weekly',
      0.6,
    )
  )

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join('\n')

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
