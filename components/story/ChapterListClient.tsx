'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, Lock, ArrowUpDown, BookOpen, X, ChevronLeft, ChevronRight, Loader2, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Chapter {
  id: string
  chapterNum: number
  title: string | null
  isLocked: boolean
  publishedAt: Date | string | null
}

interface Props {
  chapters: Chapter[]       // initial 50 chapters from SSR (for instant render)
  storySlug: string
  totalChapters: number
}

const PAGE_SIZE = 20

export default function ChapterListClient({ chapters: initialChapters, storySlug, totalChapters }: Props) {
  const [search, setSearch] = useState('')
  const [sortDesc, setSortDesc] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // All chapters — start with SSR data, then lazy-load full list if there are more
  const [allChapters, setAllChapters] = useState<Chapter[]>(initialChapters)
  const [loading, setLoading] = useState(false)

  // Lazy-load full chapter list if SSR only returned a partial set
  useEffect(() => {
    if (initialChapters.length >= totalChapters) return
    setLoading(true)
    fetch(`/api/stories/${storySlug}/chapters`)
      .then(r => r.json())
      .then(d => {
        if (d.chapters?.length) setAllChapters(d.chapters)
      })
      .catch(() => { /* keep SSR data if fetch fails */ })
      .finally(() => setLoading(false))
  }, [storySlug, totalChapters, initialChapters.length])

  // Sort chapters
  const sorted = useMemo(() => {
    const list = [...allChapters].sort((a, b) => a.chapterNum - b.chapterNum)
    return sortDesc ? list.reverse() : list
  }, [allChapters, sortDesc])

  // Search — searches across ALL loaded chapters
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return sorted.filter(ch =>
      ch.chapterNum.toString().includes(q) ||
      (ch.title?.toLowerCase() ?? '').includes(q)
    )
  }, [sorted, search])

  // Active list (search or all)
  const activeList = searchResults ?? sorted

  // Pagination
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE))

  // Reset to page 1 when search or sort changes
  useEffect(() => { setCurrentPage(1) }, [search, sortDesc])
  // Clamp page after list changes
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return activeList.slice(start, start + PAGE_SIZE)
  }, [activeList, currentPage])

  // Page number window (show up to 5 pages around current)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = []
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      pages.push(p)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }, [currentPage, totalPages])

  return (
    <div>
      {/* Header + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full gradient-primary flex-shrink-0" />
          <h2 className="text-lg font-bold">Danh sách chương</h2>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            ({search ? `${activeList.length}/` : ''}{totalChapters} chương)
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSortDesc(d => !d)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              sortDesc ? 'border-primary/50 bg-primary/5 text-primary' : 'border-border hover:bg-muted text-muted-foreground'
            }`}>
            <ArrowUpDown className="w-3.5 h-3.5"/>
            {sortDesc ? 'Mới nhất' : 'Cũ nhất'}
          </button>
        </div>
      </div>

      {/* Search box */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"/>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm số chương hoặc tên chương..."
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-muted/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors"/>
          </button>
        )}
      </div>

      {/* Chapter grid */}
      {paginated.length === 0 ? (
        <div className="py-10 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2"/>
          <p className="text-sm text-muted-foreground">Không tìm thấy chương nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {paginated.map(ch => (
            <ChapterCard key={ch.id} ch={ch} storySlug={storySlug} />
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-5 flex-wrap">
          {/* First */}
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Trang đầu"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          {/* Prev */}
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          {pageNumbers.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setCurrentPage(p as number)}
                className={`min-w-[2.25rem] h-9 px-2 rounded-lg border text-sm font-medium transition-colors ${
                  currentPage === p
                    ? 'border-primary bg-primary text-white'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {/* Last */}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Trang cuối"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page info */}
      {totalPages > 1 && (
        <p className="text-center text-xs text-muted-foreground mt-2">
          Trang {currentPage}/{totalPages} · {activeList.length} chương
        </p>
      )}
    </div>
  )
}

function ChapterCard({ ch, storySlug }: { ch: Chapter; storySlug: string }) {
  return (
    <Link
      href={`/truyen/${storySlug}/chuong/${ch.chapterNum}`}
      className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent transition-all duration-200 group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {ch.isLocked && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"/>}
        <div className="min-w-0">
          <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
            {ch.title || `Chương ${ch.chapterNum}`}
          </p>
          {ch.title && (
            <p className="text-xs text-muted-foreground">Chương {ch.chapterNum}</p>
          )}
        </div>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
        {ch.publishedAt ? formatDate(ch.publishedAt as string) : ''}
      </span>
    </Link>
  )
}
