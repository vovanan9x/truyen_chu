import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatNumber } from '@/lib/utils'
import { Users, Search } from 'lucide-react'
import AdminUsersClient from './AdminUsersClient'

export const metadata: Metadata = { title: 'Quản lý người dùng' }

const PER_PAGE = 20

export default async function AdminUsersPage({
  searchParams
}: { searchParams: { page?: string; q?: string; filter?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const q = searchParams.q ?? ''
  const filter = searchParams.filter ?? 'all'

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (filter === 'banned') where.isBanned = true
  if (filter === 'admin') where.role = 'ADMIN'

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, take: PER_PAGE, skip: (page - 1) * PER_PAGE,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true, coinBalance: true, createdAt: true,
        isBanned: true, banReason: true, level: true, xp: true, followerCount: true,
        _count: { select: { bookmarks: true, readingHistory: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)
  const filterCls = (f: string) => `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'gradient-primary text-white' : 'border border-border hover:bg-muted'}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatNumber(total)} người dùng</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" action="/admin/nguoi-dung" className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input name="q" defaultValue={q} placeholder="Tìm email hoặc tên..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"/>
          <input type="hidden" name="filter" value={filter}/>
        </form>
        <div className="flex gap-2">
          {[['all','Tất cả'],['banned','🚫 Bị cấm'],['admin','Admin']].map(([f,l]) => (
            <Link key={f} href={`/admin/nguoi-dung?q=${q}&filter=${f}`} className={filterCls(f)}>{l}</Link>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground rounded-2xl border border-border">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p>Không tìm thấy người dùng.</p>
        </div>
      ) : (
        <AdminUsersClient initialUsers={users as any}/>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && <Link href={`/admin/nguoi-dung?q=${q}&filter=${filter}&page=${page - 1}`} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">← Trước</Link>}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={`/admin/nguoi-dung?q=${q}&filter=${filter}&page=${p}`}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium ${p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>{p}</Link>
          ))}
          {page < totalPages && <Link href={`/admin/nguoi-dung?q=${q}&filter=${filter}&page=${page + 1}`} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">Tiếp →</Link>}
        </div>
      )}
    </div>
  )
}
