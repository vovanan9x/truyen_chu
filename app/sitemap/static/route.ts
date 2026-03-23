import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const STATIC_PAGES = [
  { url: BASE_URL,                            changefreq: 'daily',   priority: 1.0 },
  { url: `${BASE_URL}/truyen`,                changefreq: 'daily',   priority: 0.9 },
  { url: `${BASE_URL}/bang-xep-hang`,         changefreq: 'daily',   priority: 0.9 },
  { url: `${BASE_URL}/truyen-hoan-thanh`,     changefreq: 'daily',   priority: 0.8 },
  { url: `${BASE_URL}/the-loai`,              changefreq: 'weekly',  priority: 0.7 },
  { url: `${BASE_URL}/dang-nhap`,             changefreq: 'yearly',  priority: 0.3 },
  { url: `${BASE_URL}/dang-ky`,               changefreq: 'yearly',  priority: 0.3 },
]

// GET /sitemap/static.xml
export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const urls = STATIC_PAGES.map(p => [
    `  <url>`,
    `    <loc>${p.url}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    `    <changefreq>${p.changefreq}</changefreq>`,
    `    <priority>${p.priority.toFixed(1)}</priority>`,
    `  </url>`,
  ].join('\n'))

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join('\n')

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
