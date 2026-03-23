'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, Check, Globe, Image, AlertCircle, Megaphone, Code2, ShieldCheck, Wifi, WifiOff } from 'lucide-react'

const DEFAULT_SETTINGS = {
  site_domain: '',
  site_name: '',
  site_logo: '',
  site_favicon: '',
  site_description: '',
  // Ads slots
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
  // Crawler proxy
  crawl_proxy_host: '',
  crawl_proxy_port: '10000',
  crawl_proxy_user: '',
  crawl_proxy_pass: '',
  crawl_use_playwright: '',
}

type Settings = typeof DEFAULT_SETTINGS
const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const labelCls = 'text-xs font-medium text-muted-foreground block mb-1.5'

export default function AdminGeneralSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [logoPreview, setLogoPreview] = useState('')
  const [faviconPreview, setFaviconPreview] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)
  const [testingProxy, setTestingProxy] = useState(false)
  const [proxyTestResult, setProxyTestResult] = useState<{ ok: boolean; ip?: string; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(data => {
      setSettings(prev => ({ ...prev, ...data }))
      if (data.site_logo) setLogoPreview(data.site_logo)
      if (data.site_favicon) setFaviconPreview(data.site_favicon)
    }).finally(() => setLoading(false))
  }, [])

  function set(key: keyof Settings, val: string) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function uploadFile(file: File, field: 'site_logo' | 'site_favicon') {
    const setUploading = field === 'site_logo' ? setUploadingLogo : setUploadingFavicon
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Upload thất bại'); return }
      const { url } = await res.json()
      set(field, url)
      if (field === 'site_logo') setLogoPreview(url)
      else setFaviconPreview(url)
    } catch { setError('Lỗi khi upload file') }
    setUploading(false)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
      else { const d = await res.json(); setError(d.error ?? 'Lỗi lưu') }
    } catch { setError('Lỗi kết nối') }
    setSaving(false)
  }

  async function testProxy() {
    setTestingProxy(true)
    setProxyTestResult(null)
    try {
      const res = await fetch('/api/admin/crawler/test-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: settings.crawl_proxy_host,
          port: settings.crawl_proxy_port,
          user: settings.crawl_proxy_user,
          pass: settings.crawl_proxy_pass,
        }),
      })
      const data = await res.json()
      setProxyTestResult(data)
    } catch {
      setProxyTestResult({ ok: false, error: 'Lỗi kết nối tới server' })
    }
    setTestingProxy(false)
  }

  if (loading) return <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="animate-spin w-5 h-5" /> Đang tải...</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" /> Cài đặt chung
        </h1>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 disabled:opacity-60 shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Đang lưu...' : saved ? '✅ Đã lưu!' : 'Lưu cài đặt'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Domain & Site Info */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Domain & Thông tin site</h2>
        <p className="text-xs text-muted-foreground">Domain được dùng trong canonical URL, sitemap, Open Graph, và các đường link tĩnh trong email.</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Domain chính <span className="text-destructive">*</span></label>
            <input
              value={settings.site_domain}
              onChange={e => set('site_domain', e.target.value)}
              placeholder="https://truyenchu.vn"
              className={inputCls + ' font-mono'}
            />
            <p className="text-xs text-muted-foreground mt-1">Không có dấu / ở cuối. VD: <code className="bg-muted px-1 rounded">https://truyenchu.vn</code></p>
          </div>
          <div>
            <label className={labelCls}>Tên site</label>
            <input
              value={settings.site_name}
              onChange={e => set('site_name', e.target.value)}
              placeholder="TruyenChu"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Mô tả site (meta description mặc định)</label>
            <textarea
              value={settings.site_description}
              onChange={e => set('site_description', e.target.value)}
              placeholder="Đọc truyện online miễn phí..."
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Image className="w-4 h-4 text-primary" /> Logo</h2>
        <div className="flex items-start gap-5">
          {/* Preview */}
          <div className="w-32 h-16 rounded-xl border border-border bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
              : <span className="text-xs text-muted-foreground">Chưa có</span>
            }
          </div>
          <div className="flex-1 space-y-2">
            <input
              value={settings.site_logo}
              onChange={e => { set('site_logo', e.target.value); setLogoPreview(e.target.value) }}
              placeholder="https://... hoặc /logo.png"
              className={inputCls}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">hoặc</span>
              <button
                onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium transition-colors disabled:opacity-60"
              >
                {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                {uploadingLogo ? 'Đang upload...' : 'Tải lên file'}
              </button>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'site_logo')} />
            </div>
            <p className="text-xs text-muted-foreground">PNG hoặc SVG, nền trong suốt. Tỷ lệ đề xuất: 4:1 (VD: 200×50px)</p>
          </div>
        </div>
      </div>

      {/* Favicon */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Image className="w-4 h-4 text-amber-500" /> Favicon</h2>
        <div className="flex items-start gap-5">
          {/* Preview */}
          <div className="w-16 h-16 rounded-xl border border-border bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {faviconPreview
              ? <img src={faviconPreview} alt="Favicon" className="w-8 h-8 object-contain" />
              : <span className="text-xs text-muted-foreground text-center">Chưa có</span>
            }
          </div>
          <div className="flex-1 space-y-2">
            <input
              value={settings.site_favicon}
              onChange={e => { set('site_favicon', e.target.value); setFaviconPreview(e.target.value) }}
              placeholder="https://... hoặc /favicon.ico"
              className={inputCls}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">hoặc</span>
              <button
                onClick={() => faviconRef.current?.click()}
                disabled={uploadingFavicon}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium transition-colors disabled:opacity-60"
              >
                {uploadingFavicon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                {uploadingFavicon ? 'Đang upload...' : 'Tải lên file'}
              </button>
              <input ref={faviconRef} type="file" accept="image/*,.ico" className="hidden"
                onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], 'site_favicon')} />
            </div>
            <p className="text-xs text-muted-foreground">ICO, PNG, hoặc SVG. Kích thước: 32×32 hoặc 64×64px</p>
          </div>
        </div>
      </div>

      {/* Ads */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Code2 className="w-4 h-4 text-amber-500" /> Quảng cáo (Custom HTML/JS)</h2>
        <p className="text-xs text-muted-foreground">Chèn bất kỳ đoạn mã HTML/JavaScript nào vào các vị trí cố định. Tương thích Google AdSense, Google Ad Manager, và mọi mạng quảng cáo khác.</p>
        <div className="space-y-4">
          {([
            { enabledKey: 'ad_header_enabled',       codeKey: 'ad_header_code',       label: '📌 Header — Băng ngang dưới thanh điều hướng',         hint: 'Hiện trên tất cả các trang, dưới header' },
            { enabledKey: 'ad_reader_top_enabled',   codeKey: 'ad_reader_top_code',   label: '📖 Trang đọc — Đầu nội dung chương',                   hint: 'Hiện trước nội dung chương truyện' },
            { enabledKey: 'ad_reader_bottom_enabled',codeKey: 'ad_reader_bottom_code',label: '📖 Trang đọc — Cuối nội dung chương',                   hint: 'Hiện sau nội dung chương, trước phần bình luận' },
            { enabledKey: 'ad_story_detail_enabled', codeKey: 'ad_story_detail_code', label: '📚 Chi tiết truyện — Dưới thông tin truyện',             hint: 'Hiện trên trang thông tin/giới thiệu truyện' },
            { enabledKey: 'ad_sidebar_enabled',      codeKey: 'ad_sidebar_code',      label: '🗂 Sidebar — Cột phải trang chi tiết (desktop)',         hint: 'Chỉ hiện trên màn hình rộng' },
          ] as { enabledKey: keyof Settings; codeKey: keyof Settings; label: string; hint: string }[]).map(slot => {
            const isOn = settings[slot.enabledKey] === '1'
            return (
              <div key={slot.codeKey} className="p-4 rounded-xl border border-border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{slot.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{slot.hint}</p>
                  </div>
                  <button
                    onClick={() => set(slot.enabledKey, isOn ? '' : '1')}
                    className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${isOn ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
                {isOn && (
                  <div>
                    <label className={labelCls}>Mã HTML / JavaScript</label>
                    <textarea
                      value={(settings as any)[slot.codeKey]}
                      onChange={e => set(slot.codeKey, e.target.value)}
                      placeholder={'<!-- Dán mã quảng cáo vào đây -->\n<ins class="adsbygoogle" ...>\n</ins>\n<script>...</script>'}
                      rows={5}
                      className={inputCls + ' resize-y font-mono text-xs'}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Hỗ trợ HTML thuần, thẻ &lt;script&gt;, và iframe. Mã sẽ được thực thi phía client.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Crawler & Proxy */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500" /> Crawler Proxy & Cloudflare Bypass</h2>
          <p className="text-xs text-muted-foreground mt-1">Dùng proxy để bypass block IP. Bật Playwright để tự động vượt Cloudflare JS Challenge (403).</p>
        </div>

        {/* Proxy fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Proxy Host</label>
            <input value={settings.crawl_proxy_host} onChange={e => set('crawl_proxy_host', e.target.value)}
              placeholder="proxy.webshare.io" className={inputCls + ' font-mono'} />
          </div>
          <div>
            <label className={labelCls}>Port</label>
            <input value={settings.crawl_proxy_port} onChange={e => set('crawl_proxy_port', e.target.value)}
              placeholder="10000" className={inputCls + ' font-mono'} />
          </div>
          <div>
            <label className={labelCls}>Username</label>
            <input value={settings.crawl_proxy_user} onChange={e => set('crawl_proxy_user', e.target.value)}
              placeholder="user" autoComplete="off" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input type="password" value={settings.crawl_proxy_pass} onChange={e => set('crawl_proxy_pass', e.target.value)}
              placeholder="••••••••" autoComplete="new-password" className={inputCls} />
          </div>
        </div>

        {/* Test proxy button + result */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={testProxy} disabled={testingProxy || !settings.crawl_proxy_host}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors disabled:opacity-50">
            {testingProxy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            {testingProxy ? 'Đang test...' : 'Test kết nối proxy'}
          </button>
          {proxyTestResult && (
            <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${
              proxyTestResult.ok ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
            }`}>
              {proxyTestResult.ok
                ? <><Wifi className="w-4 h-4" /> IP qua proxy: <strong>{proxyTestResult.ip}</strong></>
                : <><WifiOff className="w-4 h-4" /> Lỗi: {proxyTestResult.error}</>}
            </div>
          )}
        </div>

        {/* Playwright toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
          <div>
            <p className="text-sm font-semibold">🎭 Auto Playwright bypass</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tự động dùng Chromium để giải Cloudflare challenge khi gặp 403. Cookie được cache 23 tiếng.</p>
            <p className="text-xs text-amber-600 mt-1">⚠️ Cần cài trên VPS: <code className="bg-muted px-1 rounded">npx playwright install chromium && npx playwright install-deps chromium</code></p>
          </div>
          <button
            onClick={() => set('crawl_use_playwright', settings.crawl_use_playwright === '1' ? '' : '1')}
            className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4 ${
              settings.crawl_use_playwright === '1' ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}>
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              settings.crawl_use_playwright === '1' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 disabled:opacity-60 shadow-sm w-full justify-center">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saving ? 'Đang lưu...' : saved ? '✅ Đã lưu!' : 'Lưu cài đặt'}
      </button>
    </div>
  )
}
