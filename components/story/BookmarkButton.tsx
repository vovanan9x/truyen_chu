'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { BookMarked } from 'lucide-react'

interface BookmarkButtonProps {
  storyId: string
  className?: string
}

export default function BookmarkButton({ storyId, className = '' }: BookmarkButtonProps) {
  const { data: session } = useSession()
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session) return
    fetch(`/api/user/bookmark?storyId=${storyId}`)
      .then((r) => r.json())
      .then((d) => setBookmarked(d.bookmarked))
      .catch(() => {})
  }, [storyId, session])

  async function toggle() {
    if (!session) {
      window.location.href = '/dang-nhap'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/user/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      })
      const data = await res.json()
      setBookmarked(data.bookmarked)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold border border-border hover:bg-muted transition-all text-sm disabled:opacity-60 ${
        bookmarked ? 'bg-primary/10 border-primary/40 text-primary' : ''
      } ${className}`}
    >
      <BookMarked className={`w-4 h-4 ${bookmarked ? 'fill-primary' : ''}`} />
      {bookmarked ? 'Đang theo dõi' : 'Theo dõi'}
    </button>
  )
}
