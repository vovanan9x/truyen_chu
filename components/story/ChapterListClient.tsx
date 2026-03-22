'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Lock, ArrowUpDown, BookOpen, X, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Chapter {
  id: string
  chapterNum: number
  title: string | null
  isLocked: boolean
  publishedAt: Date | string | null
}

interface Props {
  chapters: Chapter[]
  storySlug: string
  totalChapters: number
}

const GROUP_SIZE = 50

export default function ChapterListClient({ chapters, storySlug, totalChapters }: Props) {
  const [search, setSearch] = useState('')
  const [sortDesc, setSortDesc] = useState(true)

  // Sort chapters asc (ch.1 → ch.N) for grouping; display order follows sortDesc
  const sorted = useMemo(() => {
    return [...chapters].sort((a, b) => a.chapterNum - b.chapterNum)
  }, [chapters])

  // Group chapters into blocks of GROUP_SIZE
  const groups = useMemo(() => {
    const result: { label: string; start: number; end: number; chapters: Chapter[] }[] = []
    for (let i = 0; i < sorted.length; i += GROUP_SIZE) {
      const slice = sorted.slice(i, i + GROUP_SIZE)
      result.push({
        label: `Ch.${slice[0].chapterNum}–${slice[slice.length - 1].chapterNum}`,
        start: slice[0].chapterNum,
        end: slice[slice.length - 1].chapterNum,
        chapters: slice,
      })
    }
    return result
  }, [sorted])

  // Default: open last group (newest chapters)
  const [openGroupIdx, setOpenGroupIdx] = useState<number>(() => Math.max(0, groups.length - 1))

  // Search bypass grouping
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    const list = sorted.filter(ch =>
      ch.chapterNum.toString().includes(q) ||
      (ch.title?.toLowerCase() ?? '').includes(q)
    )
    return sortDesc ? [...list].reverse() : list
  }, [sorted, search, sortDesc])

  // Chapters within open group, respecting sort
  const openGroupChapters = useMemo(() => {
    const g = groups[openGroupIdx]
    if (!g) return []
    return sortDesc ? [...g.chapters].reverse() : g.chapters
  }, [groups, openGroupIdx, sortDesc])

  // Groups display order (for sort)
  const displayGroups = useMemo(() =>
    sortDesc ? [...groups].reverse() : groups,
    [groups, sortDesc]
  )

  return (
    <div>
      {/* Header + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full gradient-primary flex-shrink-0" />
          <h2 className="text-lg font-bold">Danh sách chương</h2>
          <span className="text-sm text-muted-foreground">
            ({search ? `${searchResults?.length ?? 0}/` : ''}{totalChapters} chương)
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
      <div className="relative mb-3">
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

      {/* Search mode: flat list */}
      {searchResults !== null ? (
        searchResults.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2"/>
            <p className="text-sm text-muted-foreground">Không tìm thấy chương nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {searchResults.slice(0, 200).map(ch => (
              <ChapterCard key={ch.id} ch={ch} storySlug={storySlug} />
            ))}
            {searchResults.length > 200 && (
              <p className="col-span-2 text-xs text-center text-muted-foreground pt-2">
                Hiển thị 200/{searchResults.length} kết quả — hãy thu hẹp tìm kiếm
              </p>
            )}
          </div>
        )
      ) : (
        /* Accordion group mode */
        <div className="space-y-1.5">
          {displayGroups.map((g, displayIdx) => {
            // Map back to actual group index for openGroupIdx state
            const actualIdx = sortDesc ? groups.length - 1 - displayIdx : displayIdx
            const isOpen = openGroupIdx === actualIdx
            const chaps = isOpen ? openGroupChapters : []
            return (
              <div key={g.label} className="border border-border/60 rounded-xl overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => setOpenGroupIdx(isOpen ? -1 : actualIdx)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
                    isOpen ? 'bg-primary/5 text-primary border-b border-border/60' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isOpen
                      ? <ChevronDown className="w-4 h-4 flex-shrink-0"/>
                      : <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground"/>
                    }
                    <span>{g.label}</span>
                    <span className="text-xs text-muted-foreground font-normal">({g.chapters.length} chương)</span>
                  </div>
                </button>

                {/* Chapter grid inside group */}
                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2">
                    {chaps.map(ch => (
                      <ChapterCard key={ch.id} ch={ch} storySlug={storySlug} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
