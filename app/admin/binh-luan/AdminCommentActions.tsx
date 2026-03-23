'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pin, PinOff, Loader2 } from 'lucide-react'

interface Props {
  commentId: string
  isPinned: boolean
  storySlug: string
}

export default function AdminCommentActions({ commentId, isPinned, storySlug }: Props) {
  const [loading, setLoading] = useState(false)
  const [pinned, setPinned] = useState(isPinned)
  const router = useRouter()

  async function togglePin() {
    setLoading(true)
    const res = await fetch(`/api/admin/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: !pinned }),
    })
    if (res.ok) {
      setPinned(p => !p)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Xoá bình luận này?')) return
    setLoading(true)
    await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' })
    router.refresh()
    setLoading(false)
  }

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={togglePin}
        title={pinned ? 'Bỏ ghim' : 'Ghim bình luận'}
        className={`p-1.5 rounded-lg transition-colors ${pinned ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'text-muted-foreground hover:bg-amber-50 hover:text-amber-500'}`}
      >
        {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
      </button>
      <button
        onClick={handleDelete}
        title="Xoá bình luận"
        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
