'use client'

import { useState } from 'react'
import { Plus, Lock, Unlock, Trash2, Save, X, CheckSquare, Square, AlertTriangle } from 'lucide-react'

interface Chapter {
  id: string; chapterNum: number; title: string | null; isLocked: boolean
  coinCost: number; wordCount: number; publishedAt: Date | string
}

export default function AdminChapterActions({ storyId, initialChapters }: { storyId: string; initialChapters: Chapter[] }) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Bulk select state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const allSelected = chapters.length > 0 && selected.size === chapters.length
  const someSelected = selected.size > 0

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(chapters.map(c => c.id)))
  }

  async function bulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Xoá ${selected.size} chương đã chọn? Hành động này không thể hoàn tác!`)) return
    setBulkDeleting(true)
    try {
      const res = await fetch(`/api/admin/stories/${storyId}/chapters/bulk-delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const json = await res.json()
      if (!res.ok) { alert(json.error ?? 'Lỗi xoá'); return }
      setChapters(prev => prev.filter(c => !selected.has(c.id)))
      setSelected(new Set())
    } catch { alert('Lỗi kết nối') } finally { setBulkDeleting(false) }
  }

  async function handleAddChapter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('')
    const f = e.currentTarget
    const data = {
      chapterNum: parseInt((f.querySelector('[name=chapterNum]') as HTMLInputElement).value),
      title: (f.querySelector('[name=title]') as HTMLInputElement).value || undefined,
      content: (f.querySelector('[name=content]') as HTMLTextAreaElement).value,
      isLocked: (f.querySelector('[name=isLocked]') as HTMLInputElement).checked,
      coinCost: parseInt((f.querySelector('[name=coinCost]') as HTMLInputElement).value) || 0,
    }
    try {
      const res = await fetch(`/api/admin/stories/${storyId}/chapters`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      setChapters(prev => [...prev, json.chapter].sort((a, b) => a.chapterNum - b.chapterNum))
      setShowAdd(false); f.reset()
    } catch { setError('Lỗi kết nối') } finally { setLoading(false) }
  }

  async function toggleLock(chapter: Chapter) {
    const res = await fetch(`/api/admin/chapters/${chapter.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLocked: !chapter.isLocked }),
    })
    if (res.ok) setChapters(prev => prev.map(c => c.id === chapter.id ? { ...c, isLocked: !c.isLocked } : c))
  }

  async function deleteChapter(id: string, num: number) {
    if (!confirm(`Xoá chương ${num}?`)) return
    const res = await fetch(`/api/admin/chapters/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setChapters(prev => prev.filter(c => c.id !== id))
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm'
  const nextChNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapterNum)) + 1 : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-bold text-lg">Danh sách chương ({chapters.length})</h2>
        <div className="flex items-center gap-2">
          {/* Bulk delete bar */}
          {someSelected && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive font-medium">Đã chọn {selected.size} chương</span>
              <button
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive text-white text-xs font-semibold hover:bg-destructive/90 disabled:opacity-60 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                {bulkDeleting ? 'Đang xoá...' : 'Xoá tất cả'}
              </button>
              <button onClick={() => setSelected(new Set())} className="p-1 rounded hover:bg-muted text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
            {showAdd ? <><X className="w-4 h-4" /> Đóng</> : <><Plus className="w-4 h-4" /> Thêm chương</>}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAddChapter} className="p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4">
          <h3 className="font-semibold text-sm">Thêm chương mới</h3>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="text-xs font-medium block mb-1">Số chương *</label>
              <input name="chapterNum" type="number" defaultValue={nextChNum} min={1} required className={inputCls} /></div>
            <div className="col-span-2"><label className="text-xs font-medium block mb-1">Tiêu đề</label>
              <input name="title" placeholder="Để trống → Chương N" className={inputCls} /></div>
            <div><label className="text-xs font-medium block mb-1">Coin (VIP)</label>
              <input name="coinCost" type="number" defaultValue={0} min={0} className={inputCls} /></div>
          </div>
          <div><label className="text-xs font-medium block mb-1">Nội dung *</label>
            <textarea name="content" rows={8} required placeholder="Nội dung chương..." className={inputCls + ' resize-none'} /></div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="isLocked" className="accent-primary w-4 h-4" /> Chương VIP (khóa)
            </label>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
              <Save className="w-4 h-4" /> {loading ? 'Đang lưu...' : 'Lưu chương'}
            </button>
          </div>
        </form>
      )}

      {/* Chapter table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {chapters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Chưa có chương nào.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              {/* Select-all checkbox */}
              <th className="px-3 py-3 w-10">
                <button onClick={toggleAll} className="text-muted-foreground hover:text-foreground transition-colors">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : someSelected
                      ? <CheckSquare className="w-4 h-4 text-primary/50" />
                      : <Square className="w-4 h-4" />
                  }
                </button>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Chương</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Tiêu đề</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Từ</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Thao tác</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {chapters.map(ch => {
                const isChecked = selected.has(ch.id)
                return (
                  <tr key={ch.id} className={`hover:bg-muted/20 transition-colors ${isChecked ? 'bg-destructive/5' : ''}`}>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleOne(ch.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {isChecked
                          ? <CheckSquare className="w-4 h-4 text-destructive" />
                          : <Square className="w-4 h-4" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">#{ch.chapterNum}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">
                      {ch.title || `Chương ${ch.chapterNum}`}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground hidden md:table-cell text-xs">
                      {ch.wordCount.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ch.isLocked ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {ch.isLocked ? <><Lock className="w-2.5 h-2.5" /> VIP {ch.coinCost > 0 && `(${ch.coinCost}xu)`}</> : <><Unlock className="w-2.5 h-2.5" /> Miễn phí</>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => toggleLock(ch)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={ch.isLocked ? 'Mở khóa' : 'Khóa VIP'}>
                          {ch.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteChapter(ch.id, ch.chapterNum)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
