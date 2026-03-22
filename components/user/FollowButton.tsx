'use client'

import { useState, useTransition } from 'react'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'

interface Props {
  authorId: string
  initialFollowing: boolean
  initialCount: number
}

export default function FollowButton({ authorId, initialFollowing, initialCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const res = await fetch(`/api/authors/${authorId}/follow`, { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        setFollowing(d.following)
        setCount(prev => d.following ? prev + 1 : Math.max(0, prev - 1))
      }
    })
  }

  return (
    <button onClick={toggle} disabled={pending}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
        following
          ? 'bg-muted border border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          : 'gradient-primary text-white hover:opacity-90'
      }`}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin"/> : following ? <UserCheck className="w-4 h-4"/> : <UserPlus className="w-4 h-4"/>}
      {following ? 'Đang theo dõi' : 'Theo dõi'}
      <span className={`text-xs ${following ? 'text-muted-foreground' : 'opacity-80'}`}>({count.toLocaleString()})</span>
    </button>
  )
}
