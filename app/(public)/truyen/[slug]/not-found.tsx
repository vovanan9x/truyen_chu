import Link from 'next/link'
import { BookOpen, Home, Search, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export default async function StoryNotFound() {
  // Gợi ý vài truyện nổi bật
  const featured = await prisma.story.findMany({
    where: { status: 'ONGOING' },
    orderBy: { viewCount: 'desc' },
    take: 4,
    select: { title: true, slug: true, coverUrl: true, author: true, _count: { select: { chapters: true } } },
  }).catch(() => [])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <span className="text-[100px] sm:text-[140px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-primary/30 to-primary/10 select-none">
          404
        </span>
        <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-primary/50" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Truyện không tồn tại</h1>
      <p className="text-muted-foreground mb-2 max-w-sm text-sm">
        Truyện này chưa có trong hệ thống hoặc đã bị xóa.
      </p>
      <p className="text-xs text-muted-foreground mb-8">
        Kiểm tra lại tên truyện hoặc thử tìm kiếm bên dưới.
      </p>

      {/* Actions */}
      <div className="flex gap-3 mb-10 flex-wrap justify-center">
        <Link href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md">
          <Home className="w-4 h-4" /> Trang chủ
        </Link>
        <Link href="/tim-kiem"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors font-medium text-sm">
          <Search className="w-4 h-4" /> Tìm kiếm
        </Link>
        <Link href="/bang-xep-hang"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors font-medium text-sm">
          <TrendingUp className="w-4 h-4" /> Bảng xếp hạng
        </Link>
      </div>

      {/* Featured suggestions */}
      {featured.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="text-sm font-semibold text-muted-foreground mb-4">📚 Truyện đang hot</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {featured.map(s => (
              <Link key={s.slug} href={`/truyen/${s.slug}`}
                className="group flex flex-col rounded-xl overflow-hidden border border-border hover:border-primary/40 hover:shadow-md transition-all">
                <img
                  src={s.coverUrl ?? `https://picsum.photos/seed/${s.slug}/200/300`}
                  alt={s.title}
                  className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">{s.title}</p>
                  {s._count.chapters > 0 && (
                    <p className="text-[10px] text-muted-foreground text-center mt-0.5">{s._count.chapters} chương</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
