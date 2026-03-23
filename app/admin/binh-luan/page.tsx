import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { MessageSquare, Search, Pin, AlertTriangle, MessagesSquare } from 'lucide-react'
import AdminCommentActions from './AdminCommentActions'
import BannedWordsManager from './BannedWordsManager'

export const metadata: Metadata = { title: 'Bình luận' }

const PER_PAGE = 30

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: { page?: string; tab?: string; q?: string; filter?: string; story?: string }
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const tab = searchParams.tab ?? 'comments'
  const q = searchParams.q ?? ''
  const filter = searchParams.filter ?? 'all'
  const storyFilter = searchParams.story ?? ''

  // Build where for comments
  const where: any = { parentId: null } // chỉ show root comments (có thể expand replies)
  if (q) {
    where.OR = [
      { content: { contains: q, mode: 'insensitive' } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { story: { title: { contains: q, mode: 'insensitive' } } },
    ]
  }
  if (filter === 'pinned') where.isPinned = true
  if (storyFilter) where.storyId = storyFilter

  // Lấy danh sách từ cấm để detect vi phạm
  const bannedWords = await prisma.bannedWord.findMany({
    where: { isActive: true }, select: { word: true },
  })
  const bannedList = bannedWords.map(w => w.word.toLowerCase())

  const [comments, total, todayCount, pinnedCount] = await Promise.all([
    prisma.comment.findMany({
      where,
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
        story: { select: { id: true, title: true, slug: true } },
        replies: {
          take: 3,
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { replies: true } },
      },
    }),
    prisma.comment.count({ where }),
    prisma.comment.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.comment.count({ where: { isPinned: true } }),
  ])

  // Detect vi phạm
  function hasViolation(content: string) {
    const lower = content.toLowerCase()
    return bannedList.some(w => lower.includes(w))
  }

  // Filter vi phạm client-side (đã lấy data rồi)
  const displayComments = filter === 'violation'
    ? comments.filter(c => hasViolation(c.content))
    : comments

  const tabCls = (t: string) =>
    `px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'gradient-primary text-white' : 'text-muted-foreground hover:bg-muted'}`

  const filterCls = (f: string) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-muted text-foreground font-semibold border border-border' : 'text-muted-foreground hover:bg-muted'}`

  const totalPages = Math.ceil(total / PER_PAGE)
  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ tab, q, filter, page: String(page), ...overrides })
    return `/admin/binh-luan?${params}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quản lý bình luận</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} bình luận</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Link href="/admin/binh-luan?tab=comments" className={tabCls('comments')}>
          💬 Bình luận
        </Link>
        <Link href="/admin/binh-luan?tab=banned" className={tabCls('banned')}>
          🚫 Từ cấm
        </Link>
      </div>

      {tab === 'banned' ? (
        <BannedWordsManager />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hôm nay</p>
                <p className="font-bold text-lg">{todayCount}</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Pin className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đang ghim</p>
                <p className="font-bold text-lg">{pinnedCount}</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Từ cấm</p>
                <p className="font-bold text-lg">{bannedList.length}</p>
              </div>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-wrap gap-3 items-center">
            <form method="GET" action="/admin/binh-luan" className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Tìm nội dung, user, truyện..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
              <input type="hidden" name="tab" value="comments" />
              <input type="hidden" name="filter" value={filter} />
            </form>
            <div className="flex gap-2 flex-wrap">
              {([
                ['all', 'Tất cả'],
                ['pinned', '📌 Đang ghim'],
                ['violation', '⚠ Vi phạm'],
              ] as const).map(([f, l]) => (
                <Link key={f} href={buildUrl({ filter: f, page: '1' })} className={filterCls(f)}>
                  {l}
                </Link>
              ))}
            </div>
          </div>

          {/* Comments list */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {displayComments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <MessagesSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                Không tìm thấy bình luận.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {displayComments.map(c => {
                  const isViolation = hasViolation(c.content)
                  return (
                    <div
                      key={c.id}
                      className={`px-5 py-4 hover:bg-muted/20 transition-colors ${c.isPinned ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''} ${isViolation ? 'bg-red-50/40 dark:bg-red-950/20' : ''}`}
                    >
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {c.user.name?.[0]?.toUpperCase() ?? '?'}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {/* Link user → trang detail admin */}
                            <Link href={`/admin/nguoi-dung/${c.user.id}`}
                              className="font-medium text-sm hover:text-primary transition-colors">
                              {c.user.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">{c.user.email}</span>
                            {c.isPinned && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                <Pin className="w-3 h-3" />Ghim
                              </span>
                            )}
                            {isViolation && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                <AlertTriangle className="w-3 h-3" />Vi phạm
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDate(c.createdAt)}
                            </span>
                          </div>

                          {/* Truyện + permalink */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">Truyện:</span>
                            <Link href={`/truyen/${c.story.slug}`} target="_blank"
                              className="text-xs text-primary hover:underline truncate max-w-[200px]">
                              {c.story.title}
                            </Link>
                            {/* Permalink tới đúng comment trong truyện */}
                            <Link
                              href={`/truyen/${c.story.slug}#comment-${c.id}`}
                              target="_blank"
                              className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                            >
                              Xem trên trang
                            </Link>
                          </div>

                          {/* Nội dung — hiển thị đầy đủ, không truncate */}
                          <p className="text-sm mt-2 text-foreground/90 whitespace-pre-wrap break-words">
                            {c.content}
                          </p>

                          {/* Replies preview */}
                          {c._count.replies > 0 && (
                            <div className="mt-3 pl-3 border-l-2 border-border space-y-2">
                              {c.replies.map(r => (
                                <div key={r.id} className="text-xs text-muted-foreground">
                                  <Link href={`/admin/nguoi-dung/${r.user.id}`}
                                    className="font-medium text-foreground hover:text-primary">
                                    {r.user.name}
                                  </Link>
                                  {': '}
                                  <span className="line-clamp-1">{(r as any).content}</span>
                                </div>
                              ))}
                              {c._count.replies > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{c._count.replies - 3} reply khác
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <AdminCommentActions
                          commentId={c.id}
                          isPinned={c.isPinned}
                          storySlug={c.story.slug}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 flex-wrap">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">← Trước</Link>
              )}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <Link key={p} href={buildUrl({ page: String(p) })}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium ${p === page ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>
                  {p}
                </Link>
              ))}
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm">Tiếp →</Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
