import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { formatDate, formatNumber } from '@/lib/utils'
import AdminPaymentActions from './AdminPaymentActions'
import { Wallet, Clock, CheckCircle, XCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Yêu cầu nạp xu' }

const PER_PAGE = 30

export default async function AdminPaymentRequestsPage({
  searchParams,
}: { searchParams: { status?: string; page?: string } }) {
  const status = (searchParams.status ?? 'PENDING') as any
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))

  const [requests, total, stats] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: { status },
      include: { user: { select: { id: true, name: true, email: true, coinBalance: true } } },
      orderBy: { createdAt: 'desc' },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
    }),
    prisma.paymentRequest.count({ where: { status } }),
    prisma.paymentRequest.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ])
  const totalPages = Math.ceil(total / PER_PAGE)

  const countByStatus: Record<string, number> = {}
  for (const s of stats) countByStatus[s.status] = s._count.id

  const METHOD_LABELS: Record<string, string> = {
    bank: '🏦 Chuyển khoản', momo: '🟣 MoMo', vnpay: '🔵 VNPay',
  }
  const STATUS_TABS = [
    { value: 'PENDING', label: 'Đang chờ', icon: Clock, cls: 'text-yellow-600' },
    { value: 'APPROVED', label: 'Đã duyệt', icon: CheckCircle, cls: 'text-green-600' },
    { value: 'REJECTED', label: 'Từ chối', icon: XCircle, cls: 'text-red-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wallet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Yêu cầu nạp xu</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map(t => {
          const Icon = t.icon
          const count = countByStatus[t.value] ?? 0
          return (
            <a key={t.value} href={`?status=${t.value}`}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                status === t.value ? `border-primary text-primary` : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className={`w-4 h-4 ${t.cls}`} />
              {t.label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  t.value === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'
                }`}>{count}</span>
              )}
            </a>
          )
        })}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Không có yêu cầu nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="p-5 rounded-2xl border border-border bg-card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg text-amber-500">{formatNumber(r.packageCoins)} xu</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-semibold">{r.packagePrice.toLocaleString('vi-VN')}đ</span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs">{METHOD_LABELS[r.method]}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{r.user.name || 'Ẩn danh'}</span>
                    {' '}·{' '}{r.user.email}
                    {' '}· Số dư hiện tại: <span className="font-medium text-amber-500">{formatNumber(r.user.coinBalance)} xu</span>
                  </p>
                  {r.transactionId && (
                    <p className="text-sm text-muted-foreground">Mã GD: <span className="font-mono text-foreground">{r.transactionId}</span></p>
                  )}
                  {r.note && <p className="text-sm text-muted-foreground">Ghi chú: {r.note}</p>}
                  {r.adminNote && (
                    <p className="text-sm text-muted-foreground">Admin: <span className="italic">{r.adminNote}</span></p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(r.createdAt.toISOString())}</p>
                </div>

                {status === 'PENDING' && (
                  <AdminPaymentActions requestId={r.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {page > 1 && (
            <a href={`?status=${status}&page=${page - 1}`}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">← Trước</a>
          )}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <a key={p} href={`?status=${status}&page=${p}`}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium ${p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>{p}</a>
          ))}
          {page < totalPages && (
            <a href={`?status=${status}&page=${page + 1}`}
              className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-medium">Tiếp →</a>
          )}
        </div>
      )}
    </div>
  )
}
