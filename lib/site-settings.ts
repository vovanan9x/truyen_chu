import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

export const AD_SLOTS = ['header', 'reader_top', 'reader_bottom', 'story_detail', 'sidebar'] as const
export type AdSlot = typeof AD_SLOTS[number]

export interface SiteSettings {
  site_domain: string
  site_name: string
  site_logo: string
  site_favicon: string
  site_description: string
  // Ads — mỗi slot có code (HTML/JS) và enabled flag
  ad_header_enabled: string
  ad_header_code: string
  ad_reader_top_enabled: string
  ad_reader_top_code: string
  ad_reader_bottom_enabled: string
  ad_reader_bottom_code: string
  ad_story_detail_enabled: string
  ad_story_detail_code: string
  ad_sidebar_enabled: string
  ad_sidebar_code: string
}

const DEFAULTS: SiteSettings = {
  site_domain: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://truyenchu.vn',
  site_name: 'TruyenChu',
  site_logo: '',
  site_favicon: '',
  site_description: 'Web đọc truyện chữ tổng hợp và dịch truyện nước ngoài. Đọc truyện hay, cập nhật nhanh, miễn phí.',
  ad_header_enabled: '',
  ad_header_code: '',
  ad_reader_top_enabled: '',
  ad_reader_top_code: '',
  ad_reader_bottom_enabled: '',
  ad_reader_bottom_code: '',
  ad_story_detail_enabled: '',
  ad_story_detail_code: '',
  ad_sidebar_enabled: '',
  ad_sidebar_code: '',
}

/** Helper: kiểm tra slot có enabled không */
export function isAdEnabled(settings: SiteSettings, slot: AdSlot): boolean {
  return settings[`ad_${slot}_enabled` as keyof SiteSettings] === '1'
}

/** Helper: lấy code của slot */
export function getAdCode(settings: SiteSettings, slot: AdSlot): string {
  return settings[`ad_${slot}_code` as keyof SiteSettings] || ''
}

/**
 * Fetch site settings from DB — cached per request (revalidates every 60s).
 * Falls back to defaults for any missing key.
 */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const rows = await prisma.setting.findMany({
        where: { key: { in: Object.keys(DEFAULTS) } },
      })
      const map: Record<string, string> = {}
      for (const r of rows) map[r.key] = r.value
      return Object.fromEntries(
        Object.keys(DEFAULTS).map(k => [k, map[k] ?? (DEFAULTS as any)[k]])
      ) as unknown as SiteSettings
    } catch {
      return DEFAULTS
    }
  },
  ['site-settings'],
  { revalidate: 60 }
)
