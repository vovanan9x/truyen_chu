'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, BookOpen, Pencil, Trash2, AlertTriangle, X } from 'lucide-react'
import { formatNumber, formatDate } from '@/lib/utils'

interface Story {
  id: string
  title: string
  slug: string
  author: string | null
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS'
  viewCount: number
  updatedAt: string
  genres: { genre: { slug: string; name: string } }[]
  _count: { chapters: number }
}

const PER_PAGE = 20

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [inputQ, setInputQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  // Delete state
  const [toDelete, setToDelete] = useState<Story | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const fetchStories = useCallback(async () => {
    setLoading(true)
    const sp = new URLSearchParams({ page: String(page), ...(q && { q }), ...(status && { status }) })
    const res = await fetch(`/api/admin/stories?${sp}`)
    if (res.ok) {
      const d = await res.json()
      setStories(d.stories)
      setTotal(d.total)
      setTotalPages(d.totalPages)
    }
    setLoading(false)
  }, [page, q, status])

  useEffect(() => { fetchStories() }, [fetchStories])

  // Auto-focus confirm input when dialog opens
  useEffect(() => {
    if (toDelete) { setConfirmName(''); setTimeout(() => confirmRef.current?.focus(), 50) }
  }, [toDelete])

  // Auto-hide toast
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }
  }, [toast])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); setQ(inputQ); setPage(1)
  }

  const handleDelete = async () => {
    if (!toDelete || confirmName !== toDelete.title) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/stories?id=${toDelete.id}`, { method: 'DELETE' })
      const d = await res.json()
      if (res.ok) {
        setToast({ msg: d.message, ok: true })
        setToDelete(null)
        fetchStories()
      } else {
        setToast({ msg: d.error ?? 'Lỗi xóa truyện', ok: false })
      }
    } catch {
      setToast({ msg: 'Lỗi kết nối', ok: false })
    }
    setDeleting(false)
  }

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'ONGOING', label: 'Đang ra' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'HIATUS', label: 'Tạm dừng' },
  ]

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-destructive border border-red-200'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Delete confirm dialog */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Xóa bộ truyện?</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Hành động này không thể hoàn tác. Sẽ xóa vĩnh viễn:
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-semibold text-foreground truncate">📖 {toDelete.title}</p>
              <p className="text-muted-foreground">🗂️ {toDelete._count.chapters} chương</p>
              <p className="text-muted-foreground text-xs">+ bookmark, lịch sử đọc, bình luận, đánh giá, lịch crawl...</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Gõ tên truyện để xác nhận:
                <span className="font-semibold text-foreground ml-1">"{toDelete.title}"</span>
              </label>
              <input
                ref={confirmRef}
                value={confirmName}
                onChange={e => setConfirmName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmName === toDelete.title && handleDelete()}
                placeholder="Nhập tên truyện..."
                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setToDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmName !== toDelete.title || deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý truyện</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatNumber(total)} truyện</p>
        </div>
        <Link
          href="/admin/truyen/them"
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" /> Thêm truyện
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={inputQ}
              onChange={e => setInputQ(e.target.value)}
              placeholder="Tìm kiếm tên truyện..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-medium">Tìm</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1) }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                status === opt.value
                  ? 'gradient-primary text-white shadow-sm'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Đang tải...</div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Không tìm thấy truyện nào.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Tên truyện</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Thể loại</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Chương</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Views</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Trạng thái</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Cập nhật</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stories.map((story) => (
                <tr key={story.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium truncate max-w-[180px]">{story.title}</p>
                    <p className="text-xs text-muted-foreground">{story.author ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {story.genres.slice(0, 2).map((sg) => (
                        <span key={sg.genre.slug} className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                          {sg.genre.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell text-muted-foreground">
                    {story._count.chapters}
                  </td>
                  <td className="px-4 py-3.5 text-center hidden md:table-cell text-muted-foreground">
                    {formatNumber(story.viewCount)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      story.status === 'ONGOING' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      story.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {story.status === 'ONGOING' ? 'Đang ra' : story.status === 'COMPLETED' ? 'Hoàn thành' : 'Tạm dừng'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-muted-foreground hidden lg:table-cell text-xs">
                    {formatDate(story.updatedAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/truyen/${story.id}`}
                        className="flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                      >
                        <Pencil className="w-3 h-3" /> Sửa
                      </Link>
                      <button
                        onClick={() => setToDelete(story)}
                        className="flex items-center gap-1 text-destructive hover:underline text-xs font-medium"
                        title="Xóa bộ truyện"
                      >
                        <Trash2 className="w-3 h-3" /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <button onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">← Trước</button>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>{p}</button>
          ))}
          {page < totalPages && (
            <button onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">Tiếp →</button>
          )}
        </div>
      )}
    </div>
  )
}
