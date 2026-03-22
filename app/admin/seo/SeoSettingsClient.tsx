'use client'

import { useState, useEffect } from 'react'
import { Save, RefreshCw, Globe, FileText, BookOpen, Search, Tag, Info } from 'lucide-react'
import { SEO_DEFAULTS } from '@/lib/seo'

type SeoSettings = Record<string, string>

const SECTIONS = [
  {
    key: 'site',
    label: '🌐 Thông tin chung',
    icon: Globe,
    fields: [
      { key: 'seo.ogImage', label: 'Ảnh mặc định (OG Image URL)', hint: 'Hiện khi share link không có ảnh' },
      { key: 'seo.twitterHandle', label: 'Twitter Handle', hint: 'Ví dụ: @truyenchu' },
      { key: 'seo.googleVerification', label: 'Google Search Console Verification', hint: 'Mã xác thực từ Google Search Console' },
    ]
  },
  {
    key: 'home',
    label: '🏠 Trang chủ',
    icon: FileText,
    fields: [
      { key: 'seo.home.title', label: 'Tiêu đề trang chủ', hint: 'Biến: {siteName}' },
      { key: 'seo.home.keywords', label: 'Keywords', hint: 'Phân cách bằng dấu phẩy' },
    ]
  },
  {
    key: 'story',
    label: '📚 Trang thông tin truyện',
    icon: BookOpen,
    fields: [
      { key: 'seo.story.title', label: 'Format tiêu đề', hint: 'Biến: {title} {author} {siteName} {latestChapter}' },
      { key: 'seo.story.description', label: 'Format mô tả', hint: 'Biến: {title} {author} {latestChapter} {siteName}', textarea: true },
    ]
  },
  {
    key: 'chapter',
    label: '📖 Trang đọc chương',
    icon: BookOpen,
    fields: [
      { key: 'seo.chapter.title', label: 'Format tiêu đề', hint: 'Biến: {title} {chapter} {siteName} {author}' },
      { key: 'seo.chapter.description', label: 'Format mô tả', hint: 'Biến: {title} {chapter} {siteName}', textarea: true },
    ]
  },
  {
    key: 'search',
    label: '🔍 Tìm kiếm & Thể loại',
    icon: Search,
    fields: [
      { key: 'seo.search.title', label: 'Format tiêu đề tìm kiếm', hint: 'Biến: {query} {siteName}' },
      { key: 'seo.genre.title', label: 'Format tiêu đề thể loại', hint: 'Biến: {genre} {siteName}' },
    ]
  },
]

function charCount(s: string) { return s.length }
function lengthColor(s: string, max: number) {
  const l = s.length
  if (l === 0) return 'text-muted-foreground'
  if (l > max) return 'text-red-500'
  if (l > max * 0.85) return 'text-amber-500'
  return 'text-green-500'
}

export default function SeoSettingsClient() {
  const [settings, setSettings] = useState<SeoSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('site')

  useEffect(() => {
    fetch('/api/admin/seo').then(r => r.json()).then(d => {
      setSettings(d.settings)
      setLoading(false)
    })
  }, [])

  function update(key: string, value: string) {
    setSettings(p => ({ ...p, [key]: value }))
    setSaved(false)
  }

  function reset(key: string) {
    update(key, (SEO_DEFAULTS as any)[key] ?? '')
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/seo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings })
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Đang tải...</div>

  const currentSection = SECTIONS.find(s => s.key === activeSection)!

  return (
    <div className="flex gap-6">
      {/* Sidebar sections */}
      <nav className="w-48 flex-shrink-0 space-y-1">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeSection === s.key ? 'gradient-primary text-white' : 'hover:bg-muted text-muted-foreground'}`}>
            {s.label}
          </button>
        ))}
      </nav>

      {/* Form */}
      <div className="flex-1 space-y-5">
        <div className="p-5 rounded-2xl border border-border bg-card space-y-5">
          <h2 className="font-bold text-base flex items-center gap-2">
            {currentSection.label}
          </h2>
          {/* Note: trường đã chuyển sang Cài đặt chung */}
          {activeSection === 'site' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tên site</strong> và <strong>Mô tả site</strong> được lấy từ{' '}
                <a href="/admin/cai-dat/chung" className="underline font-semibold">Cài đặt chung</a>.
                Thay đổi ở đây sẽ tự động ảnh hưởng SEO.
              </span>
            </div>
          )}
          {activeSection === 'home' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Mô tả trang chủ</strong> dùng <strong>Mô tả site</strong> trong{' '}
                <a href="/admin/cai-dat/chung" className="underline font-semibold">Cài đặt chung</a>.
                Nếu để trống ở đó, fallback về mô tả mặc định.
              </span>
            </div>
          )}
          {currentSection.fields.map(field => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold">{field.label}</label>
                <div className="flex items-center gap-2">
                  {field.textarea && (
                    <span className={`text-xs ${lengthColor(settings[field.key] ?? '', 160)}`}>
                      {charCount(settings[field.key] ?? '')}/160
                    </span>
                  )}
                  <button onClick={() => reset(field.key)} className="text-xs text-muted-foreground hover:text-primary">Reset</button>
                </div>
              </div>
              {field.textarea ? (
                <textarea value={settings[field.key] ?? ''} onChange={e => update(field.key, e.target.value)}
                  rows={3} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"/>
              ) : (
                <input value={settings[field.key] ?? ''} onChange={e => update(field.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="w-3 h-3"/> {field.hint}
              </p>
            </div>
          ))}
        </div>

        {/* Preview */}
        {activeSection === 'home' && (
          <div className="p-4 rounded-2xl border border-border bg-card">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Preview Google Search Result</p>
            <div className="space-y-0.5">
              <p className="text-[#1a0dab] text-lg leading-snug hover:underline cursor-pointer">
                {(settings['seo.home.title'] ?? '').replace('{siteName}', settings['seo.siteName'] ?? 'TruyenChu')}
              </p>
              <p className="text-xs text-[#006621]">https://truyenchu.com</p>
              <p className="text-sm text-gray-600 leading-relaxed">{settings['seo.home.description']}</p>
            </div>
          </div>
        )}

        {activeSection === 'story' && (
          <div className="p-4 rounded-2xl border border-border bg-card">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Preview — Ví dụ truyện "Đấu Phá Thương Khung"</p>
            <div className="space-y-0.5">
              <p className="text-[#1a0dab] text-lg leading-snug hover:underline cursor-pointer">
                {(settings['seo.story.title'] ?? '').replace('{title}', 'Đấu Phá Thương Khung').replace('{author}', 'Thiên Tàm Thổ Đậu').replace('{siteName}', settings['seo.siteName'] ?? 'TruyenChu').replace('{latestChapter}', '1642')}
              </p>
              <p className="text-xs text-[#006621]">https://truyenchu.com/truyen/dau-pha-thuong-khung</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {(settings['seo.story.description'] ?? '').replace('{title}', 'Đấu Phá Thương Khung').replace('{author}', 'Thiên Tàm Thổ Đậu').replace('{latestChapter}', '1642').replace('{siteName}', settings['seo.siteName'] ?? 'TruyenChu')}
              </p>
            </div>
          </div>
        )}

        {activeSection === 'chapter' && (
          <div className="p-4 rounded-2xl border border-border bg-card">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Preview — Ví dụ chương 42</p>
            <div className="space-y-0.5">
              <p className="text-[#1a0dab] text-lg leading-snug hover:underline cursor-pointer">
                {(settings['seo.chapter.title'] ?? '').replace('{title}', 'Đấu Phá Thương Khung').replace('{chapter}', '42').replace('{siteName}', settings['seo.siteName'] ?? 'TruyenChu').replace('{author}', 'Thiên Tàm Thổ Đậu')}
              </p>
              <p className="text-xs text-[#006621]">https://truyenchu.com/truyen/dau-pha-thuong-khung/chuong/42</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {(settings['seo.chapter.description'] ?? '').replace('{title}', 'Đấu Phá Thương Khung').replace('{chapter}', '42').replace('{siteName}', settings['seo.siteName'] ?? 'TruyenChu')}
              </p>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end gap-3">
          {saved && <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">✅ Đã lưu!</span>}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            Lưu cài đặt SEO
          </button>
        </div>
      </div>
    </div>
  )
}
