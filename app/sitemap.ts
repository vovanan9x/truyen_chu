/**
 * /sitemap.xml — redirect về Sitemap Index có phân trang
 * File này được Next.js tự động serve tại /sitemap.xml
 * 
 * Actual sitemap index: /sitemap-index
 * Story sitemaps:   /sitemap/stories/0.xml, /1.xml, ...
 * Chapter sitemaps: /sitemap/chapters/0.xml, /1.xml, ...
 * Genre sitemap:    /sitemap/genres.xml
 * Static sitemap:   /sitemap/static.xml
 */
import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Trỏ Google về sitemap index thực sự
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/sitemap-index`,
      lastModified: new Date(),
    },
  ]
}
