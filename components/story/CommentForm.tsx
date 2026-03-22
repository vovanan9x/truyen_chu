'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Send } from 'lucide-react'

interface CommentFormProps {
  storyId: string
  onCommentAdded: (comment: { id: string; content: string; createdAt: string; user: { name: string | null; avatar: string | null } }) => void
}

export default function CommentForm({ storyId, onCommentAdded }: CommentFormProps) {
  const { data: session } = useSession()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!session) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        <a href="/dang-nhap" className="text-primary hover:underline font-medium">Đăng nhập</a> để bình luận.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, content: content.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Lỗi khi đăng bình luận')
        return
      }
      onCommentAdded(data.comment)
      setContent('')
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {session.user.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Viết bình luận của bạn..."
          rows={3}
          maxLength={1000}
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none"
          required
        />
      </div>
      <div className="flex justify-between items-center pl-11">
        <span className="text-xs text-muted-foreground">{content.length}/1000</span>
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {loading ? 'Đang gửi...' : 'Gửi'}
        </button>
      </div>
    </form>
  )
}
