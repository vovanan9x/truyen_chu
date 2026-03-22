import { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Search, BookOpen, Pencil } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatNumber, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Quản lý truyện' }

const PER_PAGE = 20

export default async function AdminStoriesPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; status?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const q = searchParams.q ?? ''
  const status = searchParams.status ?? ''

  const where = {
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(status ? { status: status as 'ONGOING' | 'COMPLETED' | 'HIATUS' } : {}),
  }

  const [stories, total] = await Promise.all([
    prisma.story.findMany({
      where,
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      orderBy: { updatedAt: 'desc' },
      include: {
        genres: { include: { genre: true } },
        _count: { select: { chapters: true } },
      },
    }),
    prisma.story.count({ where }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'ONGOING', label: 'Đang ra' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'HIATUS', label: 'Tạm dừng' },
  ]

  const buildUrl = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...params })
    return `/admin/truyen?${sp.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quản lý truyện</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatNumber(total)} truyện</p>
        </div>
        <Link
          href="/admin/truyen/them"
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" /> Thêm truyện
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form method="GET" action="/admin/truyen" className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm kiếm tên truyện..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((opt) => (
            <Link
              key={opt.value}
              href={buildUrl({ status: opt.value, page: '1' })}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                status === opt.value
                  ? 'gradient-primary text-white shadow-sm'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {stories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Không tìm thấy truyện nào.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Tên truyện</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Thể loại</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Chương</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Views</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Trạng thái</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Cập nhật</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stories.map((story) => (
                <tr key={story.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium truncate max-w-[180px]">{story.title}</p>
                    <p className="text-xs text-muted-foreground">{story.author ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {story.genres.slice(0, 2).map((sg) => (
                        <span key={sg.genre.slug} className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                          {sg.genre.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center hidden sm:table-cell text-muted-foreground">
                    {story._count.chapters}
                  </td>
                  <td className="px-4 py-3.5 text-center hidden md:table-cell text-muted-foreground">
                    {formatNumber(story.viewCount)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      story.status === 'ONGOING' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      story.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {story.status === 'ONGOING' ? 'Đang ra' : story.status === 'COMPLETED' ? 'Hoàn thành' : 'Tạm dừng'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-muted-foreground hidden lg:table-cell text-xs">
                    {formatDate(story.updatedAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/truyen/${story.id}`}
                      className="flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                    >
                      <Pencil className="w-3 h-3" /> Sửa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">← Trước</Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={buildUrl({ page: String(p) })} className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>{p}</Link>
          ))}
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">Tiếp →</Link>
          )}
        </div>
      )}
    </div>
  )
}
