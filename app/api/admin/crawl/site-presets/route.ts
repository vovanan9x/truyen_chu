// GET /api/admin/crawl/site-presets — Danh sách preset SiteConfig (D)
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const SITE_PRESETS = [
  {
    key: 'truyenfull',
    name: 'TruyenFull',
    domain: 'truyenfull.vision',
    titleSelector: 'h3.title',
    authorSelector: 'a[href*="/tac-gia/"]',
    coverSelector: '.book img',
    descSelector: '.desc-text',
    genreSelector: 'a[href*="/the-loai/"]',
    chapterListSel: '.list-chapter li a',
    chapterContentSel: '#chapter-c',
    nextPageSel: 'a[title="Trang sau"]',
    notes: 'Preset cho TruyenFull.vision — hoạt động tốt với selector mặc định',
  },
  {
    key: 'metruyencv',
    name: 'MeTruyenChu (CV)',
    domain: 'metruyencv.com',
    titleSelector: '.title-truyen h1',
    authorSelector: '.info-holder a[href*="/tac-gia"]',
    coverSelector: '.book-avatar img',
    descSelector: '.summary-content',
    genreSelector: 'a[href*="/the-loai"]',
    chapterListSel: '.list-chapter .col a',
    chapterContentSel: '#article',
    notes: 'Preset cho MeTruyenChu (metruyencv.com)',
  },
  {
    key: 'tangthuvien',
    name: 'Tàng Thư Viện',
    domain: 'tangthuvien.vn',
    titleSelector: '.book-intro .name',
    authorSelector: '.book-intro .author a',
    coverSelector: '.book-intro .book-img img',
    descSelector: '.book-intro-detail .book-intro-content',
    genreSelector: '.book-intro-detail a[href*="/the-loai"]',
    chapterListSel: '#chapter-list a',
    chapterContentSel: '.chapter-content',
    chapterApiUrl: '/truyen/{storyId}/chapters?page={page}',
    storyIdPattern: '"story_id":(\\d+)',
    notes: 'Preset cho Tàng Thư Viện — hỗ trợ API phân trang',
  },
  {
    key: 'truyenyy',
    name: 'TruyenYY',
    domain: 'truyenyy.vip',
    titleSelector: '.title-truyen h1',
    authorSelector: 'a[href*="tac-gia"]',
    coverSelector: '.book-feature img',
    descSelector: '.detail-content',
    genreSelector: 'a[href*="the-loai"]',
    chapterListSel: '#list-chapter .row a',
    chapterContentSel: '#chapter-big-container',
    notes: 'Preset cho TruyenYY',
  },
  {
    key: 'wikidich',
    name: 'WikiDich',
    domain: 'wikidich.com',
    titleSelector: 'h1.title',
    authorSelector: '.info-author a',
    coverSelector: 'img.book-cover',
    descSelector: '.summary p',
    genreSelector: 'a[href*="/the-loai"]',
    chapterListSel: '.list-chapter a',
    chapterContentSel: '.reading-detail',
    notes: 'Preset cho WikiDich',
  },
]

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ presets: SITE_PRESETS })
}
