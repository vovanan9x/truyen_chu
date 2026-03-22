import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Tag, BookOpen, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Thể loại truyện',
  description: 'Khám phá truyện theo thể loại yêu thích tại TruyenChu',
}

export default async function GenresIndexPage() {
  const genres = await prisma.genre.findMany({
    include: { _count: { select: { stories: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Tag className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Thể loại truyện</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {genres.map((genre) => (
          <Link key={genre.id} href={`/the-loai/${genre.slug}`}
            className="group flex items-center justify-between p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:bg-primary/5 transition-all">
            <div>
              <p className="font-semibold group-hover:text-primary transition-colors">{genre.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <BookOpen className="w-3 h-3" />
                <span>{genre._count.stories} truyện</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>

      {genres.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có thể loại nào.</p>
        </div>
      )}
    </div>
  )
}
