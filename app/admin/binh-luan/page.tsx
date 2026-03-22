import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import AdminCommentActions from './AdminCommentActions'
import BannedWordsManager from './BannedWordsManager'

export const metadata: Metadata = { title: 'Bình luận' }

export default async function AdminCommentsPage({ searchParams }: { searchParams: { page?: string; tab?: string } }) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const tab = searchParams.tab ?? 'comments'
  const PER_PAGE = 30

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      take: PER_PAGE, skip: (page - 1) * PER_PAGE, orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        story: { select: { title: true, slug: true } },
      },
    }),
    prisma.comment.count(),
  ])

  const tabCls = (t: string) =>
    `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'gradient-primary text-white' : 'text-muted-foreground hover:bg-muted'}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý bình luận</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} bình luận</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Link href="/admin/binh-luan?tab=comments" className={tabCls('comments')}>💬 Bình luận</Link>
        <Link href="/admin/binh-luan?tab=banned" className={tabCls('banned')}>🚫 Từ cấm</Link>
      </div>

      {tab === 'banned' ? (
        <BannedWordsManager/>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {comments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Chưa có bình luận nào.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {c.user.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-sm">{c.user.name}</span>
                        <span className="text-xs text-muted-foreground">{c.user.email}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        Truyện: <span className="text-primary">{c.story.title}</span>
                      </p>
                      <p className="text-sm mt-1 text-foreground/90 line-clamp-2">{c.content}</p>
                    </div>
                    <AdminCommentActions commentId={c.id} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {Math.ceil(total / PER_PAGE) > 1 && (
            <div className="flex justify-center gap-2">
              {page > 1 && <a href={`/admin/binh-luan?tab=comments&page=${page - 1}`} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">← Trước</a>}
              {page < Math.ceil(total / PER_PAGE) && <a href={`/admin/binh-luan?tab=comments&page=${page + 1}`} className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">Tiếp →</a>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
