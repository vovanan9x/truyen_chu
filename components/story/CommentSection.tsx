'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Heart, MessageCircle, Send, ChevronDown, Loader2, Flag, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { EmojiPicker } from './EmojiPicker'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CommentUser { id: string; name: string | null; avatar: string | null; level?: number }
interface CommentData {
  id: string; content: string; createdAt: string; likeCount: number; isPinned: boolean
  user: CommentUser; likedByMe: boolean
  replies: CommentData[]; _count: { replies: number }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 'md' }: { user: CommentUser; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name ?? ''} className={`${s} rounded-full object-cover flex-shrink-0 ring-2 ring-border`} />
  }
  const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-orange-400 to-rose-500', 'from-pink-500 to-rose-500']
  const color = colors[(user.name?.charCodeAt(0) ?? 0) % colors.length]
  return (
    <div className={`${s} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {user.name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi })
  } catch { return '' }
}

// ─── Comment Input ─────────────────────────────────────────────────────────────

function CommentInput({
  storyId, parentId, placeholder = 'Viết bình luận...', onSubmit, onCancel, autoFocus = false
}: {
  storyId: string; parentId?: string; placeholder?: string
  onSubmit: (c: CommentData) => void; onCancel?: () => void; autoFocus?: boolean
}) {
  const { data: session } = useSession()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const MAX = 2000

  if (!session) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        <Link href="/dang-nhap" className="text-primary hover:underline font-semibold">Đăng nhập</Link> để tham gia bình luận.
      </p>
    )
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    if (!el) { setContent(c => c + emoji); return }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    const next = content.slice(0, start) + emoji + content.slice(end)
    setContent(next)
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, content: content.trim(), parentId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      onSubmit(data.comment); setContent('')
    } catch { setError('Lỗi kết nối') }
    setLoading(false)
  }

  const pct = content.length / MAX
  const charColor = pct > 0.95 ? 'text-destructive' : pct > 0.8 ? 'text-amber-500' : 'text-muted-foreground'

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2.5 items-start">
        <Avatar user={{ id: session.user.id ?? '', name: session.user.name ?? '', avatar: session.user.image ?? null }} />
        <div className="flex-1 rounded-2xl border border-border bg-muted/30 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/30 transition-all overflow-hidden">
          <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
            placeholder={placeholder} autoFocus={autoFocus} rows={3} maxLength={MAX}
            className="w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none text-sm resize-none"
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && submit(e as any)} />

          {/* Toolbar */}
          <div className="flex items-center gap-1 px-3 pb-2 pt-1 border-t border-border/40">
            <EmojiPicker onSelect={insertEmoji} />
            <span className="flex-1 text-xs text-muted-foreground">Ctrl+Enter để gửi</span>
            <span className={`text-xs font-mono mr-2 ${charColor}`}>{content.length}/{MAX}</span>
            {onCancel && (
              <button type="button" onClick={onCancel}
                className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Hủy
              </button>
            )}
            <button type="submit" disabled={loading || !content.trim()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg gradient-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {loading ? 'Gửi...' : 'Gửi'}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="text-xs text-destructive pl-11">{error}</p>}
    </form>
  )
}

// ─── Single Comment ───────────────────────────────────────────────────────────

function CommentItem({ comment, storyId, depth = 0 }: { comment: CommentData; storyId: string; depth?: number }) {
  const { data: session } = useSession()
  const [liked, setLiked] = useState(comment.likedByMe)
  const [likeCount, setLikeCount] = useState(comment.likeCount)
  const [liking, setLiking] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [replies, setReplies] = useState<CommentData[]>(comment.replies ?? [])
  const [totalReplies, setTotalReplies] = useState(comment._count?.replies ?? 0)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [replyCursor, setReplyCursor] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  // Scroll + highlight khi URL hash trỏ đến comment này
  useEffect(() => {
    if (depth > 0) return
    if (window.location.hash === `#comment-${comment.id}`) {
      setHighlighted(true)
      setTimeout(() => itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
      setTimeout(() => setHighlighted(false), 2500)
    }
  }, [comment.id, depth])

  async function toggleLike() {
    if (!session) return
    setLiking(true)
    const res = await fetch(`/api/comments/${comment.id}/like`, { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      setLiked(d.liked); setLikeCount(c => d.liked ? c + 1 : c - 1)
    }
    setLiking(false)
  }

  async function loadMoreReplies() {
    setLoadingReplies(true)
    const cursor = replyCursor ?? (replies.length > 0 ? replies[replies.length - 1].id : undefined)
    const url = `/api/comments/${comment.id}/replies${cursor ? `?cursor=${cursor}` : ''}`
    const res = await fetch(url)
    if (res.ok) {
      const d = await res.json()
      setReplies(prev => [...prev, ...d.replies])
      setReplyCursor(d.replies.length > 0 ? d.replies[d.replies.length - 1].id : null)
    }
    setLoadingReplies(false)
  }

  return (
    <div
      id={`comment-${comment.id}`}
      ref={itemRef}
      className={`flex gap-2.5 ${depth > 0 ? 'pl-10' : ''} rounded-xl transition-all duration-700 ${highlighted ? 'ring-2 ring-amber-400/60 bg-amber-400/5' : ''}`}
    >
      <Link href={`/nguoi-dung/${comment.user.id}`} className="flex-shrink-0 mt-0.5">
        <Avatar user={comment.user} size={depth > 0 ? 'sm' : 'md'} />
      </Link>
      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className={`bg-muted/40 hover:bg-muted/60 rounded-2xl px-4 py-3 transition-colors ${comment.isPinned ? 'border border-primary/30 bg-primary/5' : ''}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/nguoi-dung/${comment.user.id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                {comment.user.name || 'Ẩn danh'}
              </Link>
              {comment.user.level !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full gradient-primary text-white text-[10px] font-bold leading-none">
                  Lv{comment.user.level ?? 1}
                </span>
              )}
              {comment.isPinned && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">📌 Ghim</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm mt-1.5 whitespace-pre-line break-words leading-relaxed">{comment.content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mt-1.5 px-2">
          <button onClick={toggleLike} disabled={liking || !session}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'}`}>
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-rose-500' : ''} transition-transform ${liking ? 'scale-125' : ''}`} />
            {likeCount > 0 && likeCount}
          </button>
          {depth < 2 && (
            <button onClick={() => setShowReply(!showReply)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="w-3.5 h-3.5" />
              Trả lời
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReply && (
          <div className="mt-2">
            <CommentInput storyId={storyId} parentId={comment.id} autoFocus
              placeholder={`Trả lời ${comment.user.name ?? 'bình luận'}...`}
              onSubmit={c => { setReplies(prev => [...prev, c]); setTotalReplies(t => t + 1); setShowReply(false) }}
              onCancel={() => setShowReply(false)} />
          </div>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map(r => <CommentItem key={r.id} comment={r} storyId={storyId} depth={depth + 1} />)}
          </div>
        )}

        {/* Load more replies */}
        {totalReplies > replies.length && (
          <button onClick={loadMoreReplies} disabled={loadingReplies}
            className="flex items-center gap-1.5 mt-2 ml-10 text-xs text-primary font-medium hover:underline disabled:opacity-60">
            {loadingReplies ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
            Xem thêm {totalReplies - replies.length} trả lời
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main CommentSection ──────────────────────────────────────────────────────

interface Props { storyId: string; initialComments: CommentData[] }

export default function CommentSection({ storyId, initialComments }: Props) {
  const [comments, setComments] = useState<CommentData[]>(initialComments)
  const [cursor, setCursor] = useState<string | null>(initialComments.length >= 15 ? (initialComments[initialComments.length - 1]?.id ?? null) : null)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    setLoading(true)
    const res = await fetch(`/api/comments?storyId=${storyId}&cursor=${cursor}`)
    if (res.ok) {
      const d = await res.json()
      setComments(prev => [...prev, ...d.comments])
      setCursor(d.nextCursor)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">Bình luận <span className="text-muted-foreground font-normal text-base">({comments.length}{cursor ? '+' : ''})</span></h3>
      </div>

      {/* Input at top */}
      <CommentInput storyId={storyId}
        onSubmit={c => setComments(prev => [c, ...prev])}
        placeholder="Chia sẻ cảm nhận của bạn về truyện này..." />

      <hr className="border-border/60" />

      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(c => <CommentItem key={c.id} comment={c} storyId={storyId} />)}
        </div>
      )}

      {/* Load more */}
      {cursor && (
        <button onClick={loadMore} disabled={loading}
          className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
          {loading ? 'Đang tải...' : 'Xem thêm bình luận'}
        </button>
      )}
    </div>
  )
}
