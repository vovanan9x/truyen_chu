import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, Coins, BookMarked, Clock, ChevronRight, List } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatNumber } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Tài khoản của tôi',
}

export default async function AccountPage() {
  const session = await auth()
  if (!session) redirect('/dang-nhap')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: { bookmarks: true, readingHistory: true, transactions: true, readingLists: true },
      },
    },
  })
  if (!user) redirect('/dang-nhap')

  const recentHistory = await prisma.readingHistory.findMany({
    where: { userId: user.id },
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: {
      story: { select: { title: true, slug: true, coverUrl: true } },
      chapter: { select: { chapterNum: true } },
    },
  })

  const menuItems = [
    { href: '/tai-khoan/lich-su', icon: Clock, label: 'Lịch sử đọc', count: user._count.readingHistory },
    { href: '/tai-khoan/bookmark', icon: BookMarked, label: 'Truyện theo dõi', count: user._count.bookmarks },
    { href: '/tai-khoan/danh-sach', icon: List, label: 'Danh sách đọc', count: user._count.readingLists },
    { href: '/nap-coin', icon: Coins, label: 'Nạp xu', count: null },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-6">
        <div className="relative flex-shrink-0">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name ?? ''} className="w-20 h-20 rounded-full object-cover ring-2 ring-border"/>
          ) : (
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-white text-3xl font-bold">
              {user.name?.[0]?.toUpperCase() ?? <User className="w-10 h-10" />}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{user.name}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-amber-600">{formatNumber(user.coinBalance)} xu</span>
            </div>
            <Link href="/tai-khoan/chinh-sua"
              className="text-xs text-primary hover:underline font-medium">
              ✏️ Chỉnh sửa hồ sơ
            </Link>
          </div>
        </div>
        <Link
          href="/nap-coin"
          className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm flex-shrink-0"
        >
          + Nạp xu
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm group-hover:text-primary transition-colors">{item.label}</p>
                {item.count !== null && (
                  <p className="text-xs text-muted-foreground">{item.count} mục</p>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>

      {/* Recent Reading */}
      {recentHistory.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full gradient-primary" />
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Đọc gần đây
              </h2>
            </div>
            <Link href="/tai-khoan/lich-su" className="text-sm text-primary hover:underline flex items-center gap-1">
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentHistory.map((h) => (
              <Link
                key={h.storyId}
                href={`/truyen/${h.story.slug}/chuong/${h.chapter?.chapterNum ?? 1}`}
                className="flex items-center gap-4 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-accent transition-all group"
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {h.story.coverUrl ? (
                    <img src={h.story.coverUrl} alt={h.story.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full gradient-primary opacity-50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{h.story.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chương {h.chapter?.chapterNum ?? 1}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
