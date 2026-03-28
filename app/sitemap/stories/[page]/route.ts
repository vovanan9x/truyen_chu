import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const PER_PAGE = 5000

function xmlHeader() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
}

function xmlFooter() {
  return `</urlset>`
}

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

// GET /sitemap/stories/[page].xml
export async function GET(_req: Request, { params }: { params: { page: string } }) {
  const page = Math.max(0, parseInt(params.page) || 0)

  const stories = await prisma.story.findMany({
    skip: page * PER_PAGE,
    take: PER_PAGE,
    orderBy: { updatedAt: 'desc' },
    // Fix #8: Only index stories that have at least 1 chapter — skip empty crawl shells
    where: { chapters: { some: {} } },
    select: { slug: true, updatedAt: true, status: true },
  })

  if (stories.length === 0) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const urls = stories.map(s =>
    urlEntry(
      `${BASE_URL}/truyen/${s.slug}`,
      s.updatedAt.toISOString().split('T')[0],
      s.status === 'COMPLETED' ? 'monthly' : 'daily',
      0.8,
    )
  )

  const xml = [xmlHeader(), ...urls, xmlFooter()].join('\n')

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
