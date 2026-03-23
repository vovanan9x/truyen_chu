import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatNumber } from '@/lib/utils'
import { Users, Search, ShieldCheck, BookOpen, Languages, UserX } from 'lucide-react'
import AdminUsersClient from './AdminUsersClient'

export const metadata: Metadata = { title: 'Quản lý người dùng' }

const PER_PAGE = 20

const SORT_OPTIONS: Record<string, object> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  coins: { coinBalance: 'desc' },
  level: { level: 'desc' },
  followers: { followerCount: 'desc' },
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; filter?: string; sort?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const q = searchParams.q ?? ''
  const filter = searchParams.filter ?? 'all'
  const sort = searchParams.sort ?? 'newest'

  // Build where
  const where: any = {}
  if (q) {
    const numQ = parseInt(q)
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      ...(!isNaN(numQ) ? [{ displayId: numQ }] : []),
    ]
  }
  if (filter === 'banned') where.isBanned = true
  if (filter === 'admin') where.role = 'ADMIN'
  if (filter === 'author') where.role = 'AUTHOR'
  if (filter === 'translator') where.role = 'TRANSLATOR'

  const orderBy = SORT_OPTIONS[sort] ?? { createdAt: 'desc' }

  const [users, total, stats] = await Promise.all([
    prisma.user.findMany({
      where,
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      orderBy,
      select: {
        id: true, displayId: true, name: true, email: true, role: true,
        avatar: true, coinBalance: true, createdAt: true,
        isBanned: true, banReason: true, level: true, xp: true, followerCount: true,
        _count: { select: { bookmarks: true, readingHistory: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({
      by: ['role', 'isBanned'],
      _count: { _all: true },
    }),
  ])

  // Tính stats
  const totalUsers = stats.reduce((s, r) => s + r._count._all, 0)
  const bannedCount = stats.filter(r => r.isBanned).reduce((s, r) => s + r._count._all, 0)
  const adminCount = stats.filter(r => r.role === 'ADMIN' && !r.isBanned).reduce((s, r) => s + r._count._all, 0)
  const authorCount = stats.filter(r => r.role === 'AUTHOR' && !r.isBanned).reduce((s, r) => s + r._count._all, 0)
  const translatorCount = stats.filter(r => r.role === 'TRANSLATOR' && !r.isBanned).reduce((s, r) => s + r._count._all, 0)

  const totalPages = Math.ceil(total / PER_PAGE)

  const filterCls = (f: string) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`

  const sortCls = (s: string) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sort === s ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{formatNumber(total)} người dùng</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tổng</p>
            <p className="font-bold text-lg">{formatNumber(totalUsers)}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Admin</p>
            <p className="font-bold text-lg">{adminCount}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tác giả</p>
            <p className="font-bold text-lg">{authorCount}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <UserX className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bị cấm</p>
            <p className="font-bold text-lg">{bannedCount}</p>
          </div>
        </div>
      </div>

      {/* Search + Filter + Sort */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <form method="GET" action="/admin/nguoi-dung" className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Tìm email, tên hoặc ID#..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
            <input type="hidden" name="filter" value={filter} />
            <input type="hidden" name="sort" value={sort} />
          </form>

          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'Tất cả'],
              ['admin', '🛡 Admin'],
              ['author', '✍ Tác giả'],
              ['translator', '🌐 Dịch giả'],
              ['banned', '🚫 Bị cấm'],
            ] as const).map(([f, l]) => (
              <Link key={f} href={`/admin/nguoi-dung?q=${q}&filter=${f}&sort=${sort}`} className={filterCls(f)}>
                {l}
              </Link>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Sắp xếp:</span>
          {([
            ['newest', 'Mới nhất'],
            ['oldest', 'Cũ nhất'],
            ['coins', 'Xu nhiều nhất'],
            ['level', 'Level cao nhất'],
            ['followers', 'Followers nhiều'],
          ] as const).map(([s, l]) => (
            <Link key={s} href={`/admin/nguoi-dung?q=${q}&filter=${filter}&sort=${s}`} className={sortCls(s)}>
              {l}
            </Link>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground rounded-2xl border border-border">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Không tìm thấy người dùng.</p>
        </div>
      ) : (
        <AdminUsersClient initialUsers={users as any} />
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {page > 1 && (
            <Link href={`/admin/nguoi-dung?q=${q}&filter=${filter}&sort=${sort}&page=${page - 1}`}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">← Trước</Link>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/admin/nguoi-dung?q=${q}&filter=${filter}&sort=${sort}&page=${p}`}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium ${p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={`/admin/nguoi-dung?q=${q}&filter=${filter}&sort=${sort}&page=${page + 1}`}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">Tiếp →</Link>
          )}
        </div>
      )}
    </div>
  )
}
