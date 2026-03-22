import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BookOpen, Clock, BookX, CheckCircle2, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Danh sách đọc' }

const STATUS_TABS = [
  { value: 'READING',   label: 'Đang đọc',    icon: BookOpen,    color: 'text-blue-500',   bg: 'bg-blue-500/10' },
  { value: 'PLAN',      label: 'Đọc sau',      icon: Clock,       color: 'text-amber-500',  bg: 'bg-amber-500/10' },
  { value: 'DROPPED',   label: 'Bỏ dở',        icon: BookX,       color: 'text-red-500',    bg: 'bg-red-500/10' },
  { value: 'COMPLETED', label: 'Đã đọc xong',  icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
]

const PER_PAGE = 20

export default async function ReadingListPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string }
}) {
  const session = await auth()
  if (!session) redirect('/dang-nhap')

  const activeStatus = STATUS_TABS.find(t => t.value === searchParams.status)?.value ?? 'READING'
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))

  // Count per tab
  const counts = await prisma.readingList.groupBy({
    by: ['status'],
    where: { userId: session.user.id },
    _count: { storyId: true },
  })
  const countMap: Record<string, number> = {}
  for (const c of counts) countMap[c.status] = c._count.storyId

  const [items, total] = await Promise.all([
    prisma.readingList.findMany({
      where: { userId: session.user.id, status: activeStatus as any },
      orderBy: { updatedAt: 'desc' },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      include: {
        story: {
          select: {
            id: true, title: true, slug: true, coverUrl: true,
            author: true, status: true,
            _count: { select: { chapters: true } },
          },
        },
      },
    }),
    prisma.readingList.count({ where: { userId: session.user.id, status: activeStatus as any } }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)
  const activeTab = STATUS_TABS.find(t => t.value === activeStatus)!

  const storyStatusLabel: Record<string, string> = { ONGOING: 'Đang ra', COMPLETED: 'Hoàn thành', HIATUS: 'Tạm dừng' }
  const storyStatusColor: Record<string, string> = {
    ONGOING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    HIATUS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 rounded-full gradient-primary" />
        <h1 className="text-xl font-bold">Danh sách đọc</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map(tab => {
          const Icon = tab.icon
          const count = countMap[tab.value] ?? 0
          const isActive = tab.value === activeStatus
          return (
            <Link
              key={tab.value}
              href={`/tai-khoan/danh-sach?status=${tab.value}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                isActive
                  ? 'gradient-primary text-white border-transparent shadow-sm'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                isActive ? 'bg-white/20 text-white' : `${tab.bg} ${tab.color}`
              }`}>{count}</span>
            </Link>
          )
        })}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-border rounded-2xl">
          <activeTab.icon className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Chưa có truyện nào trong danh sách "{activeTab.label}"</p>
          <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
            Khám phá truyện →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ story, updatedAt }) => (
            <Link
              key={story.id}
              href={`/truyen/${story.slug}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent/50 transition-all group"
            >
              {/* Cover */}
              <div className="w-14 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {story.coverUrl ? (
                  <img src={story.coverUrl} alt={story.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full gradient-primary opacity-40 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {story.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{story.author ?? 'Đang cập nhật'}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">{story._count.chapters} chương</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${storyStatusColor[story.status]}`}>
                    {storyStatusLabel[story.status]}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/tai-khoan/danh-sach?status=${activeStatus}&page=${page - 1}`}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">← Trước</Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/tai-khoan/danh-sach?status=${activeStatus}&page=${p}`}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${
                p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'
              }`}>{p}</Link>
          ))}
          {page < totalPages && (
            <Link href={`/tai-khoan/danh-sach?status=${activeStatus}&page=${page + 1}`}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">Tiếp →</Link>
          )}
        </div>
      )}
    </div>
  )
}
