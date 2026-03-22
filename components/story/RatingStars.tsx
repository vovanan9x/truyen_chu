'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Star } from 'lucide-react'

interface RatingStarsProps {
  storyId: string
  initialRating: number
  ratingCount: number
}

export default function RatingStars({ storyId, initialRating, ratingCount }: RatingStarsProps) {
  const { data: session } = useSession()
  const [userRating, setUserRating] = useState<number | null>(null)
  const [hovering, setHovering] = useState<number | null>(null)
  const [avgRating, setAvgRating] = useState(initialRating)
  const [count, setCount] = useState(ratingCount)
  const [loading, setLoading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (!session) return
    fetch(`/api/user/rating?storyId=${storyId}`)
      .then(r => r.json())
      .then(d => setUserRating(d.userRating))
      .catch(() => {})
  }, [storyId, session])

  async function handleRate(score: number) {
    if (!session) { setShowPrompt(true); setTimeout(() => setShowPrompt(false), 3000); return }
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/user/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, score }),
      })
      const data = await res.json()
      if (res.ok) {
        setUserRating(score)
        // Optimistic update
        const newCount = userRating ? count : count + 1
        const newAvg = userRating
          ? (avgRating * count - userRating + score) / count
          : (avgRating * count + score) / newCount
        setCount(newCount)
        setAvgRating(Math.round(newAvg * 10) / 10)
      }
    } catch {}
    setLoading(false)
  }

  const display = hovering ?? userRating ?? 0

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-3">
        {/* Stars */}
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHovering(star)}
              onMouseLeave={() => setHovering(null)}
              disabled={loading}
              className="p-0.5 transition-transform hover:scale-110 disabled:cursor-default"
              title={`Đánh giá ${star} sao`}
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  star <= display
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/40 fill-transparent'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Average display */}
        <div className="text-sm">
          <span className="font-bold text-amber-500">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
          <span className="text-muted-foreground ml-1">({count} đánh giá)</span>
        </div>
      </div>

      {userRating && (
        <p className="text-xs text-muted-foreground">Bạn đã đánh giá {userRating} sao</p>
      )}
      {showPrompt && (
        <p className="text-xs text-primary animate-fade-in">
          <a href="/dang-nhap" className="underline">Đăng nhập</a> để đánh giá truyện
        </p>
      )}
    </div>
  )
}
