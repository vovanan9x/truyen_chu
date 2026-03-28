'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Search } from 'lucide-react'

interface Keyword { keyword: string; count: number }

interface SearchSuggestionsProps {
  /** Keyword just searched — used to log it after render */
  currentQuery?: string
}

export default function SearchSuggestions({ currentQuery }: SearchSuggestionsProps) {
  const [popular, setPopular] = useState<Keyword[]>([])
  const router = useRouter()

  // Load popular keywords
  useEffect(() => {
    fetch('/api/search/log')
      .then(r => r.ok ? r.json() : [])
      .then(data => setPopular(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Log the current search query (fire-and-forget)
  useEffect(() => {
    if (!currentQuery || currentQuery.length < 2) return
    const timer = setTimeout(() => {
      fetch('/api/search/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: currentQuery }),
      }).catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
  }, [currentQuery])

  if (popular.length === 0) return null

  return (
    <div className="mb-8">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        <TrendingUp className="w-3.5 h-3.5" />
        Tìm kiếm phổ biến
      </p>
      <div className="flex flex-wrap gap-2">
        {popular.map(({ keyword, count }) => (
          <button
            key={keyword}
            onClick={() => router.push(`/tim-kiem?q=${encodeURIComponent(keyword)}`)}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-primary text-sm transition-all duration-150"
          >
            <Search className="w-3 h-3 opacity-50 group-hover:opacity-100" />
            <span>{keyword}</span>
            <span className="text-[10px] text-muted-foreground group-hover:text-primary-foreground/70 tabular-nums">
              {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
