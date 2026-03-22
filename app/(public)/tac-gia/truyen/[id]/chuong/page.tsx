'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, PlusCircle, Lock, Unlock, CheckCircle2, Clock, XCircle,
  AlertCircle, ChevronLeft, Loader2, Send, Trash2, Pencil
} from 'lucide-react'

interface Chapter {
  id: string; chapterNum: number; title: string | null; wordCount: number
  isLocked: boolean; coinCost: number; publishStatus: string
  rejectReason: string | null; submittedAt: string | null; createdAt: string
}

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  DRAFT: { label: 'Nháp', cls: 'text-muted-foreground bg-muted', icon: Clock },
  PENDING: { label: 'Chờ duyệt', cls: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10', icon: Clock },
  APPROVED: { label: 'Đã duyệt', cls: 'text-green-600 bg-green-50 dark:bg-green-500/10', icon: CheckCircle2 },
  REJECTED: { label: 'Từ chối', cls: 'text-red-600 bg-red-50 dark:bg-red-500/10', icon: XCircle },
}

export default function ChapterManagePage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [story, setStory] = useState<any>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/dang-nhap')
    if (status === 'authenticated') {
      Promise.all([
        fetch(`/api/author/stories/${params.id}`).then(r => r.json()),
        fetch(`/api/author/stories/${params.id}/chapters`).then(r => r.json()),
      ]).then(([s, c]) => {
        setStory(s); setChapters(c.chapters ?? [])
        setLoading(false)
      })
    }
  }, [status])

  const ownerType = story?.ownerType ?? 'AUTHOR'
  const dashBase = ownerType === 'TRANSLATOR' ? '/dich-gia' : '/tac-gia'

  async function deleteChapter(id: string) {
    if (!confirm('Xoá chương này? Hành động không thể hoàn tác.')) return
    setDeleting(id)
    await fetch(`/api/author/stories/${params.id}/chapters/${id}`, { method: 'DELETE' })
    setChapters(prev => prev.filter(c => c.id !== id))
    setDeleting(null)
  }

  async function submitForReview(id: string) {
    setSubmitting(id)
    await fetch(`/api/author/stories/${params.id}/chapters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit' }),
    })
    setChapters(prev => prev.map(c => c.id === id ? { ...c, publishStatus: 'PENDING', submittedAt: new Date().toISOString() } : c))
    setSubmitting(null)
  }

  if (loading || status === 'loading') return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Link href={dashBase} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1">
          <ChevronLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black line-clamp-1">{story?.title ?? 'Quản lý chương'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{chapters.length} chương</p>
        </div>
        <div className="flex gap-2">
          <Link href={`${dashBase}/truyen/${params.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Sửa truyện
          </Link>
          <Link href={`${dashBase}/truyen/${params.id}/chuong/them`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold shadow-sm hover:opacity-90">
            <PlusCircle className="w-4 h-4" /> Thêm chương
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(s => {
          const count = chapters.filter(c => c.publishStatus === s).length
          const info = STATUS[s]; const Icon = info.icon
          return (
            <div key={s} className={`p-3 rounded-xl text-center ${info.cls}`}>
              <Icon className="w-4 h-4 mx-auto mb-1" />
              <div className="text-lg font-black">{count}</div>
              <div className="text-xs">{info.label}</div>
            </div>
          )
        })}
      </div>

      {/* Chapter list */}
      {chapters.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Chưa có chương nào. Hãy thêm chương đầu tiên!</p>
          <Link href={`${dashBase}/truyen/${params.id}/chuong/them`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90">
            <PlusCircle className="w-4 h-4" /> Thêm chương
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
          {chapters.map(ch => {
            const si = STATUS[ch.publishStatus] ?? STATUS.DRAFT; const Icon = si.icon
            return (
              <div key={ch.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="w-10 text-center">
                  <span className="text-sm font-black text-muted-foreground">{ch.chapterNum}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-1">
                    {ch.title || `Chương ${ch.chapterNum}`}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span>{ch.wordCount.toLocaleString()} chữ</span>
                    <span>{ch.isLocked ? `🔒 ${ch.coinCost} xu` : '🆓 Miễn phí'}</span>
                  </div>
                  {ch.publishStatus === 'REJECTED' && ch.rejectReason && (
                    <p className="mt-1 text-xs text-red-600 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {ch.rejectReason}
                    </p>
                  )}
                </div>

                <span className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${si.cls}`}>
                  <Icon className="w-3 h-3" /> {si.label}
                </span>

                <div className="flex gap-1 flex-shrink-0">
                  {/* Submit for review if DRAFT or REJECTED */}
                  {(ch.publishStatus === 'DRAFT' || ch.publishStatus === 'REJECTED') && (
                    <button onClick={() => submitForReview(ch.id)} disabled={submitting === ch.id}
                      className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                      title="Gửi duyệt">
                      {submitting === ch.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <Link href={`${dashBase}/truyen/${params.id}/chuong/${ch.id}/sua`}
                    className="p-2 rounded-lg hover:bg-muted transition-colors" title="Sửa">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <button onClick={() => deleteChapter(ch.id)} disabled={deleting === ch.id}
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors" title="Xoá">
                    {deleting === ch.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
