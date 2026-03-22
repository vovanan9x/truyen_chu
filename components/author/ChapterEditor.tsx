'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Send, Lock, Unlock } from 'lucide-react'

interface ChapterEditorProps {
  storyId: string
  ownerType: 'AUTHOR' | 'TRANSLATOR'
  chapterId?: string
  initial?: {
    chapterNum?: number; title?: string; content?: string
    isLocked?: boolean; coinCost?: number; sourceUrl?: string
    publishStatus?: string
  }
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'
const labelCls = 'block text-xs font-semibold text-muted-foreground mb-1.5'

export default function ChapterEditor({ storyId, ownerType, chapterId, initial }: ChapterEditorProps) {
  const router = useRouter()
  const dashBase = ownerType === 'AUTHOR' ? '/tac-gia' : '/dich-gia'

  const [chapterNum, setChapterNum] = useState(initial?.chapterNum ?? 1)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [isLocked, setIsLocked] = useState(initial?.isLocked ?? false)
  const [coinCost, setCoinCost] = useState(initial?.coinCost ?? 5)
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '')
  const [loading, setLoading] = useState<'save' | 'submit' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  async function save(action: 'save' | 'submit') {
    if (!content.trim()) { setError('Nội dung không được để trống'); return }
    setLoading(action); setError(''); setSuccess('')

    const url = chapterId
      ? `/api/author/stories/${storyId}/chapters/${chapterId}`
      : `/api/author/stories/${storyId}/chapters`
    const method = chapterId ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterNum: Number(chapterNum),
        title: title || undefined,
        content,
        isLocked,
        coinCost: isLocked ? Number(coinCost) : 0,
        sourceUrl: sourceUrl || undefined,
        action,
      }),
    })
    const d = await res.json()
    if (res.ok) {
      if (action === 'submit') {
        setSuccess('✅ Đã gửi duyệt! Admin sẽ phê duyệt sớm nhất có thể.')
        // Nếu tạo mới thì cập nhật URL để tiếp tục sửa
        if (!chapterId && d.chapter?.id) {
          router.replace(`${dashBase}/truyen/${storyId}/chuong/${d.chapter.id}/sua`)
        }
      } else {
        setSuccess('✅ Đã lưu nháp.')
      }
    } else {
      setError(d.error ?? 'Có lỗi xảy ra')
    }
    setLoading(null)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {error && <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>}
      {success && <div className="p-3 rounded-xl bg-green-500/10 text-green-600 text-sm">{success}</div>}

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Số chương <span className="text-destructive">*</span></label>
          <input type="number" min={1} value={chapterNum} onChange={e => setChapterNum(Number(e.target.value))} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Tên chương (không bắt buộc)</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Gặp gỡ tình cờ" className={inputCls} />
        </div>
      </div>

      {ownerType === 'TRANSLATOR' && (
        <div>
          <label className={labelCls}>Link nguồn chương</label>
          <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." className={inputCls} />
        </div>
      )}

      {/* Lock toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <button type="button" onClick={() => setIsLocked(!isLocked)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
            isLocked ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'border-border hover:border-muted-foreground/40'
          }`}>
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          {isLocked ? 'Chương khoá (trả xu)' : 'Chương miễn phí'}
        </button>
        {isLocked && (
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={9999} value={coinCost}
              onChange={e => setCoinCost(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <span className="text-sm text-muted-foreground">xu</span>
          </div>
        )}
      </div>

      {/* Content editor */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={labelCls + ' mb-0'}>Nội dung <span className="text-destructive">*</span></label>
          <span className="text-xs text-muted-foreground">{wordCount.toLocaleString()} từ</span>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={24}
          placeholder="Nhập nội dung chương tại đây..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[400px] font-mono"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 sticky bottom-4">
        <button onClick={() => save('save')} disabled={loading !== null}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-border bg-background text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-60">
          {loading === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Lưu nháp
        </button>
        <button onClick={() => save('submit')} disabled={loading !== null}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-white font-bold hover:opacity-90 disabled:opacity-60 shadow-md text-sm">
          {loading === 'submit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Gửi duyệt
        </button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        💡 <strong>Lưu nháp</strong> để tiếp tục viết — <strong>Gửi duyệt</strong> khi đã hoàn chỉnh. Admin sẽ xét duyệt và thông báo cho bạn.
      </p>
    </div>
  )
}
