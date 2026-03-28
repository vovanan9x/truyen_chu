import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { BookOpen, Home, TrendingUp } from 'lucide-react'

export default async function NotFound() {
  const featured = await prisma.story.findMany({
    where: { isFeatured: true },
    take: 4,
    select: { title: true, slug: true, coverUrl: true },
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">
      {/* Big 404 */}
      <div className="relative mb-8">
        <span className="text-[120px] sm:text-[180px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-primary/30 to-primary/10 select-none">
          404
        </span>
        <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-primary/60" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Trang không tồn tại</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa. Hãy thử một trong các link bên dưới!
      </p>

      <div className="flex gap-3 mb-12 flex-wrap justify-center">
        <Link href="/" className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity shadow-md">
          <Home className="w-4 h-4" /> Về trang chủ
        </Link>
        <Link href="/bang-xep-hang" className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:bg-muted transition-colors font-medium">
          <TrendingUp className="w-4 h-4" /> Bảng xếp hạng
        </Link>
      </div>

      {featured.length > 0 && (
        <div className="w-full max-w-xl">
          <p className="text-sm font-semibold text-muted-foreground mb-4">Có thể bạn muốn đọc?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {featured.map(s => (
              <Link key={s.slug} href={`/truyen/${s.slug}`}
                className="group flex flex-col rounded-xl overflow-hidden border border-border hover:border-primary/40 hover:shadow-md transition-all">
                <img src={s.coverUrl ?? 'https://picsum.photos/seed/' + s.slug + '/200/300'}
                  alt={s.title} className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300" />
                <p className="px-2 py-1.5 text-xs font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">{s.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
