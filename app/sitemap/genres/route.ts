import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

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

// GET /sitemap/genres.xml
export async function GET() {
  const genres = await prisma.genre.findMany({
    select: { slug: true },
    orderBy: { name: 'asc' },
  })

  const urls = genres.map(g =>
    urlEntry(`${BASE_URL}/the-loai/${g.slug}`, new Date().toISOString().split('T')[0], 'weekly', 0.7)
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
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
    },
  })
}
