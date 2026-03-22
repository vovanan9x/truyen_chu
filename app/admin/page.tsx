import { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, Users, Eye, TrendingUp, Plus, RefreshCw } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatNumber } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboard() {
  const [storyCount, userCount, totalViews, recentStories] = await Promise.all([
    prisma.story.count(),
    prisma.user.count(),
    prisma.story.aggregate({ _sum: { viewCount: true } }),
    prisma.story.findMany({
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { chapters: true } } },
    }),
  ])

  const stats = [
    { label: 'Tổng truyện', value: formatNumber(storyCount), icon: BookOpen, color: 'from-orange-400 to-orange-600' },
    { label: 'Người dùng', value: formatNumber(userCount), icon: Users, color: 'from-blue-400 to-blue-600' },
    { label: 'Lượt xem', value: formatNumber(totalViews._sum.viewCount ?? 0), icon: Eye, color: 'from-green-400 to-green-600' },
    { label: 'Lượt xem trung bình', value: storyCount > 0 ? formatNumber(Math.floor((totalViews._sum.viewCount ?? 0) / storyCount)) : '0', icon: TrendingUp, color: 'from-purple-400 to-purple-600' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/admin/truyen/them"
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" /> Thêm truyện
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="p-5 rounded-2xl border border-border bg-card shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3 shadow-sm`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent stories */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">Truyện mới cập nhật</h2>
          <Link href="/admin/truyen" className="text-sm text-primary hover:underline">Xem tất cả →</Link>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Tên truyện</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Chương</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Lượt xem</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentStories.map((story) => (
                <tr key={story.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium truncate max-w-[200px]">{story.title}</p>
                    <p className="text-xs text-muted-foreground">{story.author ?? '—'}</p>
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
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/truyen/${story.id}`}
                      className="text-primary hover:underline text-xs font-medium"
                    >
                      Sửa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
