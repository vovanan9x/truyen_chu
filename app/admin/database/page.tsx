import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { Database, Activity, RefreshCw } from 'lucide-react'
import DatabaseBrowser from './DatabaseBrowser'

export const metadata: Metadata = { title: 'Quản lý Database' }
export const revalidate = 0

async function getQuickStats() {
  const start = Date.now()
  const [users, stories, chapters, comments] = await Promise.all([
    prisma.user.count(), prisma.story.count(), prisma.chapter.count(), prisma.comment.count(),
  ])
  const pingMs = Date.now() - start
  const tableSizes = await prisma.$queryRaw<{ table_name: string; total_size: string }[]>`
    SELECT relname AS table_name, pg_size_pretty(pg_total_relation_size(oid)) AS total_size
    FROM pg_class WHERE relkind = 'r' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY pg_total_relation_size(oid) DESC LIMIT 10
  `
  return { users, stories, chapters, comments, pingMs, tableSizes }
}

export default async function AdminDatabasePage() {
  const stats = await getQuickStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Database className="w-6 h-6"/>Quản lý Database</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Xem, sửa, xoá bản ghi trực tiếp · Ping DB: <span className={`font-bold ${stats.pingMs < 100 ? 'text-green-500' : 'text-amber-500'}`}>{stats.pingMs}ms</span>
          </p>
        </div>
        <a href="/admin/database" className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">
          <RefreshCw className="w-4 h-4"/>Làm mới
        </a>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '👤', label: 'Users', count: stats.users },
          { icon: '📚', label: 'Stories', count: stats.stories },
          { icon: '📄', label: 'Chapters', count: stats.chapters },
          { icon: '💬', label: 'Comments', count: stats.comments },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl border border-border bg-card">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="text-2xl font-black">{s.count.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table sizes */}
      <details className="rounded-2xl border border-border bg-card overflow-hidden">
        <summary className="px-5 py-3.5 font-semibold cursor-pointer hover:bg-muted/50 flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4"/>Kích thước bảng PostgreSQL
        </summary>
        <div className="border-t border-border divide-y divide-border/50">
          {stats.tableSizes.map(t => (
            <div key={t.table_name} className="flex items-center justify-between px-5 py-2.5 text-sm">
              <span className="font-mono">{t.table_name}</span>
              <span className="font-semibold text-primary">{t.total_size}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Browser */}
      <div>
        <h2 className="font-bold text-lg mb-3">🗂️ Database Browser</h2>
        <DatabaseBrowser />
      </div>
    </div>
  )
}
