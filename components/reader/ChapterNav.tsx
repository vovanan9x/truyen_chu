import Link from 'next/link'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'

interface ChapterNavProps {
  storySlug: string
  storyTitle: string
  currentChapter: number
  prevChapter: number | null
  nextChapter: number | null
  totalChapters: number
  position?: 'top' | 'bottom'
}

export default function ChapterNav({
  storySlug,
  storyTitle,
  currentChapter,
  prevChapter,
  nextChapter,
  totalChapters,
  position = 'bottom',
}: ChapterNavProps) {
  const isBottom = position === 'bottom'

  return (
    <nav className={`items-center gap-3 ${
      isBottom
        ? 'fixed bottom-0 left-0 right-0 z-40 glass border-t px-4 py-3 shadow-lg grid grid-cols-3'
        : 'flex justify-between'
    }`}>
      {/* Left: Back to story */}
      <div className="flex items-center gap-2">
        <Link
          href={`/truyen/${storySlug}`}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-border hover:bg-muted transition-colors"
          title="Trang truyện"
        >
          <Info className="w-4 h-4" />
        </Link>
      </div>

      {/* Center: Chapter navigation */}
      <div className="flex items-center justify-center gap-2">
        {prevChapter ? (
          <Link
            href={`/truyen/${storySlug}/chuong/${prevChapter}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Chương trước</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/30 text-muted-foreground text-sm font-medium opacity-50 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Chương trước</span>
          </span>
        )}

        <span className="text-sm text-muted-foreground px-2 font-medium whitespace-nowrap">
          {currentChapter}/{totalChapters}
        </span>

        {nextChapter ? (
          <Link
            href={`/truyen/${storySlug}/chuong/${nextChapter}`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-white hover:opacity-90 transition-opacity text-sm font-medium shadow-sm"
          >
            <span className="hidden sm:inline">Chương sau</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/30 text-muted-foreground text-sm font-medium opacity-50 cursor-not-allowed">
            <span className="hidden sm:inline">Chương sau</span>
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>

      {/* Right: empty spacer to balance grid */}
      <div />
    </nav>
  )
}
