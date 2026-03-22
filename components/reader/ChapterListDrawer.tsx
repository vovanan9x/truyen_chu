'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { List, X, Lock, ArrowDown, ArrowUp, ChevronUp, ChevronDown } from 'lucide-react'

interface Chapter {
  id: string
  chapterNum: number
  title: string | null
  isLocked: boolean
}

interface ChapterListDrawerProps {
  storySlug: string
  currentChapterNum: number
  chapters: Chapter[]
}

const WINDOW_SIZE = 100  // total chapters shown at once
const LOAD_MORE = 50     // how many to load per click

export default function ChapterListDrawer({ storySlug, currentChapterNum, chapters }: ChapterListDrawerProps) {
  const [open, setOpen] = useState(false)
  const [sortDesc, setSortDesc] = useState(false) // mặc định: cũ → mới

  // Chapters sorted asc (ch.1 → ch.N)
  const sorted = useMemo(() =>
    [...chapters].sort((a, b) => a.chapterNum - b.chapterNum),
    [chapters]
  )

  // Find current chapter index in sorted list
  const currentIdx = useMemo(() =>
    sorted.findIndex(c => c.chapterNum === currentChapterNum),
    [sorted, currentChapterNum]
  )

  // Window state: [windowStart, windowEnd) indices in sorted array
  const [windowStart, setWindowStart] = useState(0)
  const [windowEnd, setWindowEnd] = useState(WINDOW_SIZE)

  // When drawer opens, center window around current chapter
  useEffect(() => {
    if (!open) return
    const ci = currentIdx >= 0 ? currentIdx : 0
    const half = Math.floor(WINDOW_SIZE / 2)
    const start = Math.max(0, ci - half)
    const end = Math.min(sorted.length, start + WINDOW_SIZE)
    setWindowStart(Math.max(0, end - WINDOW_SIZE))
    setWindowEnd(end)
  }, [open, currentIdx, sorted.length])

  // Slice window and apply sort direction
  const displayChapters = useMemo(() => {
    const slice = sorted.slice(windowStart, windowEnd)
    return sortDesc ? [...slice].reverse() : slice
  }, [sorted, windowStart, windowEnd, sortDesc])

  const canLoadPrev = windowStart > 0
  const canLoadNext = windowEnd < sorted.length

  const currentRef = useRef<HTMLAnchorElement>(null)

  // Auto-scroll to current chapter after render
  useEffect(() => {
    if (open && currentRef.current) {
      setTimeout(() => {
        currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 80)
    }
  }, [open, displayChapters])

  function loadPrev() {
    setWindowStart(s => Math.max(0, s - LOAD_MORE))
  }

  function loadNext() {
    setWindowEnd(e => Math.min(sorted.length, e + LOAD_MORE))
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
        title="Danh sách chương"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Danh sách chương</span>
      </button>

      {/* Drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-80 z-50 bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-lg">Danh sách chương</h3>
                <p className="text-xs text-muted-foreground">
                  {chapters.length} chương
                  {windowStart > 0 || windowEnd < sorted.length
                    ? ` — hiện ${windowStart + 1}–${windowEnd}`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortDesc(p => !p)}
                  title={sortDesc ? 'Đang hiện: Mới → Cũ' : 'Đang hiện: Cũ → Mới'}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium transition-colors"
                >
                  {sortDesc ? <ArrowDown className="w-3.5 h-3.5"/> : <ArrowUp className="w-3.5 h-3.5"/>}
                  {sortDesc ? 'Mới → Cũ' : 'Cũ → Mới'}
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Load more — top (prev chapters) */}
            {canLoadPrev && !sortDesc && (
              <button
                onClick={loadPrev}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-b border-border"
              >
                <ChevronUp className="w-3.5 h-3.5"/>
                Tải thêm {Math.min(LOAD_MORE, windowStart)} chương trước
              </button>
            )}
            {canLoadNext && sortDesc && (
              <button
                onClick={loadNext}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-b border-border"
              >
                <ChevronUp className="w-3.5 h-3.5"/>
                Tải thêm {Math.min(LOAD_MORE, sorted.length - windowEnd)} chương sau
              </button>
            )}

            {/* Chapter list */}
            <div className="flex-1 overflow-y-auto py-2">
              {displayChapters.map((ch) => {
                const isCurrent = ch.chapterNum === currentChapterNum
                return (
                  <Link
                    key={ch.id}
                    href={`/truyen/${storySlug}/chuong/${ch.chapterNum}`}
                    ref={isCurrent ? currentRef : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between px-5 py-3 border-b border-border/40 hover:bg-muted transition-colors text-sm ${
                      isCurrent ? 'bg-primary/10 text-primary font-semibold' : ''
                    }`}
                  >
                    <span className="truncate flex-1">
                      {isCurrent && <span className="mr-1.5">▶</span>}
                      Chương {ch.chapterNum}
                      {ch.title && ` — ${ch.title}`}
                    </span>
                    {ch.isLocked && !isCurrent && (
                      <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-2" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Load more — bottom (next chapters) */}
            {canLoadNext && !sortDesc && (
              <button
                onClick={loadNext}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-t border-border"
              >
                <ChevronDown className="w-3.5 h-3.5"/>
                Tải thêm {Math.min(LOAD_MORE, sorted.length - windowEnd)} chương tiếp
              </button>
            )}
            {canLoadPrev && sortDesc && (
              <button
                onClick={loadPrev}
                className="flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-t border-border"
              >
                <ChevronDown className="w-3.5 h-3.5"/>
                Tải thêm {Math.min(LOAD_MORE, windowStart)} chương cũ hơn
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}
