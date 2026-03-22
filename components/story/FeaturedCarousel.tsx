'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, BookOpen, Eye } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'

interface FeaturedStory {
  id: string
  slug: string
  title: string
  description: string | null
  coverUrl: string | null
  author: string | null
  viewCount: number
  genres: { name: string; slug: string }[]
  _count: { chapters: number }
}

export default function FeaturedCarousel({ stories }: { stories: FeaturedStory[] }) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent((c) => (c + 1) % stories.length), [stories.length])
  const prev = () => setCurrent((c) => (c - 1 + stories.length) % stories.length)

  useEffect(() => {
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next])

  if (!stories.length) return null

  const story = stories[current]

  return (
    <div className="relative rounded-2xl overflow-hidden h-[420px] md:h-[480px] shadow-2xl group">
      {/* Background image */}
      <div className="absolute inset-0">
        {story.coverUrl ? (
          <Image
            src={story.coverUrl}
            alt={story.title}
            fill
            className="object-cover scale-110 group-hover:scale-100 transition-transform duration-700"
            priority
          />
        ) : (
          <div className="w-full h-full gradient-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-end pb-10 px-8 md:px-12">
        <div className="max-w-lg animate-fade-in space-y-4">
          {/* Genres */}
          <div className="flex flex-wrap gap-2">
            {story.genres.slice(0, 3).map((g) => (
              <span key={g.slug} className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/80 text-white">
                {g.name}
              </span>
            ))}
          </div>

          <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
            {story.title}
          </h2>

          {story.description && (
            <p className="text-sm md:text-base text-white/75 line-clamp-2 leading-relaxed">
              {story.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              {story._count.chapters} chương
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {formatNumber(story.viewCount)} lượt đọc
            </span>
            {story.author && <span>— {story.author}</span>}
          </div>

          <Link
            href={`/truyen/${story.slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white gradient-primary shadow-lg hover:opacity-90 transition-opacity text-sm"
          >
            <BookOpen className="w-4 h-4" />
            Đọc ngay
          </Link>
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full glass text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full glass text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {stories.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === current ? 'w-6 bg-primary' : 'w-1.5 bg-white/40'
            )}
          />
        ))}
      </div>
    </div>
  )
}
