'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

export default function EditStoryPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [story, setStory] = useState<any>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/stories/${params.id}`)
      .then(r => r.json()).then(setStory).catch(() => setError('Lỗi tải')).finally(() => setFetching(false))
  }, [params.id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('')
    const f = e.currentTarget
    const data = {
      title: (f.querySelector('[name=title]') as HTMLInputElement).value,
      slug: (f.querySelector('[name=slug]') as HTMLInputElement).value,
      author: (f.querySelector('[name=author]') as HTMLInputElement).value,
      coverUrl: (f.querySelector('[name=coverUrl]') as HTMLInputElement).value,
      description: (f.querySelector('[name=description]') as HTMLTextAreaElement).value,
      status: (f.querySelector('[name=status]') as HTMLSelectElement).value,
      isFeatured: (f.querySelector('[name=isFeatured]') as HTMLInputElement).checked,
      sourceUrl: (f.querySelector('[name=sourceUrl]') as HTMLInputElement).value,
      sourceName: (f.querySelector('[name=sourceName]') as HTMLInputElement).value,
    }
    try {
      const res = await fetch(`/api/admin/stories/${params.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
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
        <div><label className="text-sm font-medium block mb-1.5">URL ảnh bìa</label>
          <input name="coverUrl" type="url" defaultValue={story?.coverUrl ?? ''} className={inputCls} /></div>
        <div><label className="text-sm font-medium block mb-1.5">Giới thiệu</label>
          <textarea name="description" rows={5} defaultValue={story?.description ?? ''} className={inputCls + ' resize-none'} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium block mb-1.5">Nguồn URL</label>
            <input name="sourceUrl" type="url" defaultValue={story?.sourceUrl ?? ''} className={inputCls} /></div>
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
