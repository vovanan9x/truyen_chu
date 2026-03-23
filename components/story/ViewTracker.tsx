'use client'

import { useEffect } from 'react'

export default function ViewTracker({ storyId }: { storyId: string }) {
  useEffect(() => {
    fetch(`/api/stories/${storyId}/view`, { method: 'POST' }).catch(() => {})
  }, [storyId])

  return null
}
