import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stories = await prisma.story.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  const storyUrls: MetadataRoute.Sitemap = stories.map(s => ({
    url: `${BASE_URL}/truyen/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/bang-xep-hang`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/truyen-hoan-thanh`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/the-loai`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/dang-nhap`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/dang-ky`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]

  return [...staticPages, ...storyUrls]
}
