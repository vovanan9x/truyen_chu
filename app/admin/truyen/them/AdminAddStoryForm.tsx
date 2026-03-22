'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Loader2, Globe, BookOpen } from 'lucide-react'

interface Genre { id: string; name: string }

function slugify(str: string) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminAddStoryForm({ genres }: { genres: Genre[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ title: '', slug: '', author: '', description: '', coverUrl: '', status: 'ONGOING', sourceUrl: '' })
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleTitle(title: string) {
    setForm(f => ({ ...f, title, slug: slugify(title) }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Chỉ chấp nhận file ảnh'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh tối đa 5MB'); return }

    setUploadLoading(true); setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        setForm(f => ({ ...f, coverUrl: data.url }))
        setPreviewUrl(data.url)
      } else { setError(data.error ?? 'Upload thất bại') }
    } catch { setError('Lỗi kết nối') }
    setUploadLoading(false)
  }

  function handleUrl(url: string) {
    setForm(f => ({ ...f, coverUrl: url }))
    setPreviewUrl(url)
  }

  function toggleGenre(id: string) {
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, genreIds: selectedGenres }),
      })
      const data = await res.json()
      if (res.ok) router.push(`/admin/truyen/${data.story.id}`)
      else setError(data.error ?? 'Thêm truyện thất bại')
    } catch { setError('Lỗi kết nối') }
    setSubmitLoading(false)
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left col */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Tên truyện *</label>
            <input value={form.title} onChange={e => handleTitle(e.target.value)} required placeholder="Tên truyện..." className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Slug (URL) *</label>
            <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required className={inputCls + ' font-mono text-xs'} />
            <p className="text-xs text-muted-foreground mt-1">Tự động tạo từ tên, có thể chỉnh lại</p>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Tác giả</label>
            <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Tên tác giả..." className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Trạng thái</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
              <option value="ONGOING">Đang ra</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="HIATUS">Tạm dừng</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">URL nguồn (tuỳ chọn)</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={form.sourceUrl} onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://..." className={inputCls + ' pl-9'} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1.5">Mô tả</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5} placeholder="Giới thiệu nội dung truyện..." className={inputCls + ' resize-none'} />
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Cover image */}
          <div>
            <label className="text-sm font-medium block mb-1.5">Ảnh bìa</label>
            <div className="space-y-3">
              {/* Preview */}
              <div className="relative w-40 h-56 rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setPreviewUrl(''); setForm(f => ({ ...f, coverUrl: '' })) }}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80">
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground text-xs p-4">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Chưa có ảnh
                  </div>
                )}
              </div>

              {/* Upload button */}
              <div className="flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium transition-colors disabled:opacity-60">
                  {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload ảnh
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </div>
              <div>
                <input value={form.coverUrl} onChange={e => handleUrl(e.target.value)} placeholder="Hoặc nhập URL ảnh..." className={inputCls + ' text-xs'} />
              </div>
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="text-sm font-medium block mb-2">Thể loại</label>
            <div className="flex flex-wrap gap-2">
              {genres.map(g => (
                <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    selectedGenres.includes(g.id) ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'
                  }`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 disabled:opacity-60 shadow-sm">
          {submitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLoading ? 'Đang lưu...' : 'Thêm truyện'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-6 py-3 rounded-xl border border-border font-medium hover:bg-muted transition-colors text-sm">
          Hủy
        </button>
      </div>
    </form>
  )
}
