'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Send } from 'lucide-react'

interface Genre { id: string; name: string }

interface StoryFormProps {
  mode: 'create' | 'edit'
  ownerType: 'AUTHOR' | 'TRANSLATOR'
  storyId?: string
  initial?: Partial<StoryData>
  onSuccess?: (id: string) => void
}

interface StoryData {
  title: string
  description: string
  coverUrl: string
  status: string
  commissionRate: number
  sourceUrl: string
  sourceAuthor: string
  sourceLanguage: string
  genreIds: string[]
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow'
const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1.5'

export default function StoryForm({ mode, ownerType, storyId, initial, onSuccess }: StoryFormProps) {
  const router = useRouter()
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'ONGOING')
  const [commissionRate, setCommissionRate] = useState(initial?.commissionRate ?? 70)
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '')
  const [sourceAuthor, setSourceAuthor] = useState(initial?.sourceAuthor ?? '')
  const [sourceLanguage, setSourceLanguage] = useState(initial?.sourceLanguage ?? '')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initial?.genreIds ?? [])

  useEffect(() => {
    fetch('/api/genres').then(r => r.json()).then(d => setGenres(d.genres ?? d ?? []))
  }, [])

  function toggleGenre(id: string) {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  async function submit() {
    if (!title.trim()) { setError('Tên truyện không được để trống'); return }
    setLoading(true); setError('')

    const body = {
      title, description, coverUrl: coverUrl || undefined,
      status, commissionRate: Number(commissionRate),
      sourceUrl: sourceUrl || undefined,
      sourceAuthor: sourceAuthor || undefined,
      sourceLanguage: sourceLanguage || undefined,
      genreIds: selectedGenres,
    }

    const url = mode === 'create' ? '/api/author/stories' : `/api/author/stories/${storyId}`
    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json()

    if (res.ok) {
      const id = d.story?.id ?? storyId
      onSuccess ? onSuccess(id) : router.push(`${ownerType === 'AUTHOR' ? '/tac-gia' : '/dich-gia'}/truyen/${id}/chuong`)
    } else {
      setError(d.error ?? 'Có lỗi xảy ra')
    }
    setLoading(false)
  }

  const isTranslator = ownerType === 'TRANSLATOR'

  return (
    <div className="space-y-6 max-w-2xl">
      {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}

      {/* Cover preview */}
      {coverUrl && (
        <div className="flex justify-center">
          <img src={coverUrl} alt="Cover" className="h-48 rounded-2xl object-cover shadow-lg border border-border" />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Tên truyện <span className="text-destructive">*</span></label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nhập tên truyện..." className={inputCls} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>URL ảnh bìa</label>
          <input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." className={inputCls} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Giới thiệu</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={5} maxLength={5000} placeholder="Viết giới thiệu hấp dẫn về bộ truyện..."
            className={inputCls + ' resize-none'} />
        </div>

        <div>
          <label className={labelCls}>Trạng thái</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
            <option value="ONGOING">{isTranslator ? 'Đang dịch' : 'Đang ra'}</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="HIATUS">Tạm dừng</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Tỷ lệ hoa hồng (%)</label>
          <input type="number" min={0} max={100} value={commissionRate}
            onChange={e => setCommissionRate(Number(e.target.value))}
            className={inputCls} />
          <p className="text-xs text-muted-foreground mt-1">Mặc định 70% — bạn nhận {commissionRate}%, nền tảng nhận {100 - commissionRate}%</p>
        </div>

        {/* Translator-specific fields */}
        {isTranslator && (
          <>
            <div>
              <label className={labelCls}>Link nguồn gốc (raw)</label>
              <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tên tác giả gốc</label>
              <input value={sourceAuthor} onChange={e => setSourceAuthor(e.target.value)} placeholder="Tên tác giả..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Ngôn ngữ gốc</label>
              <input value={sourceLanguage} onChange={e => setSourceLanguage(e.target.value)} placeholder="Tiếng Trung / Tiếng Anh / Tiếng Hàn..." className={inputCls} />
            </div>
          </>
        )}
      </div>

      {/* Genre selector */}
      {genres.length > 0 && (
        <div>
          <label className={labelCls}>Thể loại</label>
          <div className="flex flex-wrap gap-2">
            {genres.map(g => (
              <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  selectedGenres.includes(g.id)
                    ? 'bg-primary text-white border-primary'
                    : 'border-border hover:border-primary/50'
                }`}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={() => router.back()} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
          Huỷ
        </button>
        <button onClick={submit} disabled={loading || !title.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-90 disabled:opacity-60 shadow-md text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Đang lưu...' : mode === 'create' ? 'Đăng truyện' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  )
}
