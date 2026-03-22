import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { formatDate, formatNumber } from '@/lib/utils'
import AdminTransactionActions from './AdminTransactionActions'

export const metadata: Metadata = { title: 'Giao dịch' }

const PER_PAGE = 30

export default async function AdminTransactionsPage({ searchParams }: { searchParams: { page?: string; type?: string; status?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const type = searchParams.type ?? ''
  const status = searchParams.status ?? ''

  const where: any = {
    ...(type && { type }),
    ...(status && { status }),
  }

  const [transactions, total, totalCoinsIn, totalCoinsOut] = await Promise.all([
    prisma.transaction.findMany({
      where, take: PER_PAGE, skip: (page - 1) * PER_PAGE, orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({ where: { type: 'DEPOSIT', status: 'SUCCESS' }, _sum: { coinAmount: true } }),
    prisma.transaction.aggregate({ where: { type: 'UNLOCK', status: 'SUCCESS' }, _sum: { coinAmount: true } }),
  ])

  const typeOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'DEPOSIT', label: 'Nạp xu' },
    { value: 'UNLOCK', label: 'Mở chương' },
  ]

  const buildUrl = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ ...(type && { type }), ...(status && { status }), ...params })
    return `/admin/giao-dich?${sp.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Giao dịch</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatNumber(total)} giao dịch</p>
        </div>
        <AdminTransactionActions />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Tổng xu nạp vào</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatNumber(totalCoinsIn._sum.coinAmount ?? 0)}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">Xu tiêu từ mở chương</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{formatNumber(Math.abs(totalCoinsOut._sum.coinAmount ?? 0))}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {typeOptions.map(opt => (
          <a key={opt.value} href={buildUrl({ type: opt.value, page: '1' })}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${type === opt.value ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>
            {opt.label}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Người dùng</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Loại</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Xu</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Trạng thái</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Ngày</th>
          </tr></thead>
          <tbody className="divide-y divide-border/50">
            {transactions.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Không có giao dịch nào.</td></tr>
            ) : transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-medium truncate">{tx.user.name}</p>
                  <p className="text-xs text-muted-foreground">{tx.user.email}</p>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === 'DEPOSIT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                    {tx.type === 'DEPOSIT' ? '💰 Nạp xu' : '🔓 Mở chương'}
                  </span>
                </td>
                <td className={`px-4 py-3.5 text-center font-bold ${tx.coinAmount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.coinAmount > 0 ? '+' : ''}{tx.coinAmount}
                </td>
                <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.status === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-xs text-muted-foreground hidden md:table-cell">{formatDate(tx.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {Math.ceil(total / PER_PAGE) > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && <a href={buildUrl({ page: String(page - 1) })} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">← Trước</a>}
          {page < Math.ceil(total / PER_PAGE) && <a href={buildUrl({ page: String(page + 1) })} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">Tiếp →</a>}
        </div>
      )}
    </div>
  )
}
