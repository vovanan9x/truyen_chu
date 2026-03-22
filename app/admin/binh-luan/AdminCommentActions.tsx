'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export default function AdminCommentActions({ commentId }: { commentId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Xoá bình luận này?')) return
    setLoading(true)
    await fetch(`/api/admin/comments/${commentId}`, { method: 'DELETE' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button onClick={handleDelete} disabled={loading}
      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 disabled:opacity-50">
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
