'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Upload, Link2, X, ImageIcon } from 'lucide-react'

export default function EditStoryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [story, setStory] = useState<any>(null)
  const [fetching, setFetching] = useState(true)

  // Cover image state
  const [coverUrl, setCoverUrl] = useState('')
  const [coverMode, setCoverMode] = useState<'url' | 'upload'>('url')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/admin/stories/${params.id}`)
      .then(r => r.json())
      .then(data => { setStory(data); setCoverUrl(data?.coverUrl ?? '') })
      .catch(() => setError('Lỗi tải'))
      .finally(() => setFetching(false))
  }, [params.id])

  async function handleUploadFile(file: File) {
    setUploading(true); setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setUploadError(data.error ?? 'Lỗi upload'); return }
      setCoverUrl(data.url)
    } catch { setUploadError('Lỗi kết nối') } finally { setUploading(false) }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('')
    const f = e.currentTarget
    const data = {
      title: (f.querySelector('[name=title]') as HTMLInputElement).value,
      slug: (f.querySelector('[name=slug]') as HTMLInputElement).value,
      author: (f.querySelector('[name=author]') as HTMLInputElement).value,
      coverUrl,
      description: (f.querySelector('[name=description]') as HTMLTextAreaElement).value,
      status: (f.querySelector('[name=status]') as HTMLSelectElement).value,
      isFeatured: (f.querySelector('[name=isFeatured]') as HTMLInputElement).checked,
      sourceUrl: (f.querySelector('[name=sourceUrl]') as HTMLInputElement).value,
      sourceName: (f.querySelector('[name=sourceName]') as HTMLInputElement).value,
    }
    try {
      const res = await fetch(`/api/admin/stories/${params.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      router.push(`/admin/truyen/${params.id}`); router.refresh()
    } catch { setError('Lỗi kết nối') } finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!confirm(`Xoá truyện "${story?.title}"?`)) return
    setDeleting(true)
    await fetch(`/api/admin/stories/${params.id}`, { method: 'DELETE' })
    router.push('/admin/truyen'); router.refresh()
  }

  if (fetching) return <div className="p-8 text-muted-foreground animate-pulse">Đang tải...</div>

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm'

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/truyen/${params.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Link>
          <h1 className="text-xl font-bold">Sửa thông tin truyện</h1>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50">
          <Trash2 className="w-4 h-4" /> {deleting ? 'Đang xoá...' : 'Xoá'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6 rounded-2xl border border-border bg-card shadow-sm">
        {error && <div className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium block mb-1.5">Tên truyện *</label>
            <input name="title" required defaultValue={story?.title} className={inputCls} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Slug *</label>
            <input name="slug" required defaultValue={story?.slug} className={inputCls + ' font-mono'} /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium block mb-1.5">Tác giả</label>
            <input name="author" defaultValue={story?.author ?? ''} className={inputCls} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Trạng thái</label>
            <select name="status" defaultValue={story?.status} className={inputCls}>
              <option value="ONGOING">Đang ra</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="HIATUS">Tạm dừng</option>
            </select></div>
        </div>

        {/* ── Cover Image ──────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Ảnh bìa</label>
            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              <button type="button"
                onClick={() => setCoverMode('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${coverMode === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                <Link2 className="w-3 h-3" /> URL
              </button>
              <button type="button"
                onClick={() => setCoverMode('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${coverMode === 'upload' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>
                <Upload className="w-3 h-3" /> Upload
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Cover preview */}
            <div className="flex-shrink-0 w-24 h-32 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center">
              {coverUrl ? (
                <img src={coverUrl} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              {coverMode === 'url' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={e => setCoverUrl(e.target.value)}
                    placeholder="/uploads/covers/... hoặc https://..."
                    className={inputCls + ' flex-1'}
                  />
                  {coverUrl && (
                    <button type="button" onClick={() => setCoverUrl('')}
                      className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f) }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {uploading
                      ? <><span className="animate-spin text-base">⏳</span> Đang upload...</>
                      : <><Upload className="w-4 h-4" /> Chọn ảnh từ máy tính</>
                    }
                  </button>
                  {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                </>
              )}

              {coverUrl && (
                <p className="text-xs text-muted-foreground break-all font-mono bg-muted/30 px-2 py-1 rounded-lg">
                  {coverUrl}
                </p>
              )}
            </div>
          </div>
        </div>

        <div><label className="text-sm font-medium block mb-1.5">Giới thiệu</label>
          <textarea name="description" rows={5} defaultValue={story?.description ?? ''} className={inputCls + ' resize-none'} /></div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium block mb-1.5">Nguồn URL</label>
            <input name="sourceUrl" type="text" defaultValue={story?.sourceUrl ?? ''} className={inputCls} /></div>
          <div><label className="text-sm font-medium block mb-1.5">Tên nguồn</label>
            <input name="sourceName" defaultValue={story?.sourceName ?? ''} className={inputCls} /></div>
        </div>

        <label className="flex items-center gap-2.5 text-sm cursor-pointer">
          <input type="checkbox" name="isFeatured" defaultChecked={story?.isFeatured} className="w-4 h-4 accent-primary" />
          Hiển thị nổi bật trên trang chủ
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 shadow-sm">
            <Save className="w-4 h-4" /> {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
          <Link href={`/admin/truyen/${params.id}`} className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">Hủy</Link>
        </div>
      </form>
    </div>
  )
}
