'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { SlidersHorizontal } from 'lucide-react'

interface Genre {
  id: string
  name: string
  slug: string
}

interface StoryFiltersProps {
  genres: Genre[]
  currentSort?: string
  currentStatus?: string
  currentGenre?: string
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới cập nhật' },
  { value: 'views', label: 'Nhiều lượt xem' },
  { value: 'rating', label: 'Đánh giá cao' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'ONGOING', label: 'Đang ra' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'HIATUS', label: 'Tạm dừng' },
]

export default function StoryFilters({
  genres,
  currentSort = 'newest',
  currentStatus,
  currentGenre,
}: StoryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`/truyen?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-muted/50 border border-border/60">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
        <SlidersHorizontal className="w-4 h-4" />
        <span className="font-medium">Lọc:</span>
      </div>

      {/* Sort */}
      <select
        value={currentSort}
        onChange={(e) => updateFilter('sort', e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={currentStatus ?? ''}
        onChange={(e) => updateFilter('status', e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Genre */}
      <select
        value={currentGenre ?? ''}
        onChange={(e) => updateFilter('genre', e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
      >
        <option value="">Tất cả thể loại</option>
        {genres.map((g) => (
          <option key={g.slug} value={g.slug}>{g.name}</option>
        ))}
      </select>
    </div>
  )
}
