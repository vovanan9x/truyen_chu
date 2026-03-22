/**
 * SEO Settings Service
 * Đọc cấu hình SEO từ DB (Setting key-value store)
 * Hỗ trợ template variables: {siteName}, {title}, {author}, {chapter}, {genre}
 */
import { prisma } from './prisma'

export const SEO_DEFAULTS = {
  'seo.home.title': '{siteName} - Đọc truyện chữ online miễn phí',
  'seo.home.keywords': 'đọc truyện, truyện chữ, đọc truyện online, truyện hay',
  'seo.story.title': '{title} - {author} | {siteName}',
  'seo.story.description': 'Đọc truyện {title} của {author}. Cập nhật đến chương {latestChapter}.',
  'seo.chapter.title': '{title} - Chương {chapter} | {siteName}',
  'seo.chapter.description': 'Đọc {title} - Chương {chapter} tại {siteName}. Cập nhật nhanh, miễn phí.',
  'seo.search.title': 'Tìm kiếm "{query}" | {siteName}',
  'seo.genre.title': 'Truyện thể loại {genre} | {siteName}',
  'seo.twitterHandle': '',
  'seo.ogImage': '',
  'seo.googleVerification': '',
}

export type SeoKey = keyof typeof SEO_DEFAULTS

// Cache 5 phút
let cache: Record<string, string> | null = null
let cacheAt = 0
const CACHE_TTL = 5 * 60 * 1000

export async function getSeoSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cacheAt < CACHE_TTL) return cache

  const rows = await prisma.setting.findMany()

  const settings: Record<string, string> = { ...SEO_DEFAULTS }
  rows.forEach(r => { settings[r.key] = r.value })

  // Inject site_name / site_description → seo.siteName / seo.home.description
  // Cài đặt chung là nguồn duy nhất, SEO không có field riêng
  settings['seo.siteName'] = settings['site_name'] || 'TruyenChu'
  if (!settings['seo.home.description']) {
    settings['seo.home.description'] = settings['site_description'] || 'Đọc truyện chữ hay, cập nhật nhanh. Tổng hợp và dịch truyện từ các nguồn uy tín.'
  }

  cache = settings
  cacheAt = Date.now()
  return settings
}

export function invalidateSeoCache() {
  cache = null
  cacheAt = 0
}

/** Điền biến vào template string */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

/** Build metadata cho trang home */
export async function buildHomeMeta() {
  const s = await getSeoSettings()
  const siteName = s['seo.siteName']
  const title = fillTemplate(s['seo.home.title'], { siteName })
  const description = s['seo.home.description']
  const keywords = s['seo.home.keywords']
  return { title, description, keywords, siteName, ogImage: s['seo.ogImage'] }
}

/** Build metadata cho trang truyện */
export async function buildStoryMeta(story: { title: string; author: string; description?: string | null; coverUrl?: string | null }, latestChapter = 0) {
  const s = await getSeoSettings()
  const siteName = s['seo.siteName']
  const vars = { siteName, title: story.title, author: story.author, latestChapter: String(latestChapter) }
  const title = fillTemplate(s['seo.story.title'], vars)
  const description = story.description?.slice(0, 160) ?? fillTemplate(s['seo.story.description'], vars)
  return { title, description, siteName, ogImage: story.coverUrl ?? s['seo.ogImage'] }
}

/** Build metadata cho trang đọc chương */
export async function buildChapterMeta(story: { title: string; author: string }, chapterNum: number) {
  const s = await getSeoSettings()
  const siteName = s['seo.siteName']
  const vars = { siteName, title: story.title, author: story.author, chapter: String(chapterNum) }
  const title = fillTemplate(s['seo.chapter.title'], vars)
  const description = fillTemplate(s['seo.chapter.description'], vars)
  return { title, description, siteName }
}
