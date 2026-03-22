'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'

interface SearchResult {
  slug: string; title: string; coverUrl: string | null; author: string | null
  status: string; _count: { chapters: number }
}

export default function SearchAutocomplete() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.length < 2) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/stories/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results ?? [])
        setOpen(true)
      } catch {}
      setLoading(false)
    }, 300)
  }, [query])

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <form onSubmit={e => { e.preventDefault(); if (query.trim().length >= 2) { setOpen(false); window.location.href = `/tim-kiem?q=${encodeURIComponent(query.trim())}` } }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Tìm truyện..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-muted/50 focus:bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {results.map(s => (
            <Link key={s.slug} href={`/truyen/${s.slug}`} onClick={() => { setOpen(false); setQuery('') }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-0">
              <img src={s.coverUrl ?? 'https://picsum.photos/seed/' + s.slug + '/40/56'}
                alt={s.title} className="w-8 h-11 rounded-lg object-cover flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground truncate">{s.author ?? 'Đang cập nhật'} • {s._count.chapters} chương</p>
              </div>
            </Link>
          ))}
          <Link href={`/tim-kiem?q=${encodeURIComponent(query)}`} onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 py-2.5 text-sm text-primary hover:bg-muted transition-colors font-medium">
            <Search className="w-3.5 h-3.5" /> Xem tất cả kết quả
          </Link>
        </div>
      )}
      {open && loading && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-card border border-border rounded-2xl shadow-xl p-4 text-sm text-center text-muted-foreground z-50">
          Đang tìm...
        </div>
      )}
    </div>
  )
}
