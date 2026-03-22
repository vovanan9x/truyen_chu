'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  BookOpen, BarChart3, PlusCircle, Coins, ChevronRight,
  Eye, MessageSquare, FileText, BookMarked, ExternalLink,
  AlertCircle, Clock
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface Story {
  id: string; title: string; slug: string; coverUrl: string | null; status: string
  viewCount: number; totalEarnings: number; commissionRate: number
  _count: { chapters: number; comments: number; bookmarks: number }
  pendingChapters?: number; rejectedChapters?: number
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ONGOING:   { label: 'Đang ra',    cls: 'bg-green-500/10 text-green-600' },
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-blue-500/10 text-blue-600' },
  HIATUS:    { label: 'Tạm dừng',   cls: 'bg-yellow-500/10 text-yellow-600' },
}

export default function AuthorDashboard() {
  const { data: session, status } = useSession()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'updatedAt' | 'viewCount' | 'earnings'>('updatedAt')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ONGOING' | 'COMPLETED' | 'HIATUS'>('ALL')

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/author/stories').then(r => r.json()).then(d => {
        setStories(d.stories ?? [])
        setLoading(false)
      })
    }
  }, [status])

  if (status === 'loading' || loading) return (
    <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  )

  const totalViews    = stories.reduce((s, st) => s + st.viewCount, 0)
  const totalEarnings = stories.reduce((s, st) => s + st.totalEarnings, 0)
  const totalComments = stories.reduce((s, st) => s + st._count.comments, 0)
  const totalBookmarks = stories.reduce((s, st) => s + st._count.bookmarks, 0)

  // Alert: truyện có chương bị từ chối hoặc đang chờ duyệt
  const pendingTotal  = stories.reduce((s, st) => s + (st.pendingChapters ?? 0), 0)
  const rejectedTotal = stories.reduce((s, st) => s + (st.rejectedChapters ?? 0), 0)

  // Sort + filter
  const displayed = stories
    .filter(st => filterStatus === 'ALL' || st.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'viewCount') return b.viewCount - a.viewCount
      if (sortBy === 'earnings')  return b.totalEarnings - a.totalEarnings
      return 0 // updatedAt — API đã sortby updatedAt desc
    })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" /> Dashboard Tác giả
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Xin chào, <span className="font-semibold text-foreground">{session?.user?.name}</span></p>
        </div>
        <Link href="/tac-gia/truyen/them"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white font-semibold text-sm shadow-md hover:opacity-90 transition-opacity">
          <PlusCircle className="w-4 h-4" /> Đăng truyện mới
        </Link>
      </div>

      {/* Alert: chương cần chú ý */}
      {(rejectedTotal > 0 || pendingTotal > 0) && (
        <div className="flex flex-wrap gap-3">
          {rejectedTotal > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{rejectedTotal}</strong> chương bị từ chối — cần chỉnh sửa lại</span>
            </div>
          )}
          {pendingTotal > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span><strong>{pendingTotal}</strong> chương đang chờ duyệt</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Truyện',      value: stories.length,           icon: BookOpen,    color: 'text-primary' },
          { label: 'Lượt đọc',   value: formatNumber(totalViews),  icon: Eye,         color: 'text-blue-500' },
          { label: 'Bookmark',    value: formatNumber(totalBookmarks), icon: BookMarked, color: 'text-rose-500' },
          { label: 'Xu kiếm được', value: formatNumber(totalEarnings), icon: Coins,   color: 'text-amber-500' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="p-5 rounded-2xl border border-border bg-card text-center">
              <Icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/tac-gia/thu-nhap" className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group">
          <Coins className="w-5 h-5 text-amber-500" />
          <div><p className="font-semibold text-sm">Thu nhập</p><p className="text-xs text-muted-foreground">{formatNumber(totalEarnings)} xu</p></div>
          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link href="/rut-xu" className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group">
          <BarChart3 className="w-5 h-5 text-green-500" />
          <div><p className="font-semibold text-sm">Rút xu</p><p className="text-xs text-muted-foreground">Phí 5%</p></div>
          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link href="/tac-gia/truyen" className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group">
          <FileText className="w-5 h-5 text-blue-500" />
          <div><p className="font-semibold text-sm">Quản lý truyện</p><p className="text-xs text-muted-foreground">{stories.length} truyện</p></div>
          <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Story list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold text-lg">Truyện của tôi</h2>
          {/* Filter + Sort controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="ALL">Tất cả</option>
              <option value="ONGOING">Đang ra</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="HIATUS">Tạm dừng</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="updatedAt">Mới cập nhật</option>
              <option value="viewCount">Lượt đọc</option>
              <option value="earnings">Xu kiếm được</option>
            </select>
            <Link href="/tac-gia/truyen" className="text-sm text-primary hover:underline">Xem tất cả →</Link>
          </div>
        </div>

        {displayed.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-border">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">{stories.length === 0 ? 'Bạn chưa có truyện nào.' : 'Không có truyện nào phù hợp bộ lọc.'}</p>
            {stories.length === 0 && (
              <Link href="/tac-gia/truyen/them" className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90">
                <PlusCircle className="w-4 h-4" /> Đăng truyện đầu tiên
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
            {displayed.map(story => {
              const sb = STATUS_BADGE[story.status]
              const hasIssue = (story.rejectedChapters ?? 0) > 0
              const hasPending = (story.pendingChapters ?? 0) > 0
              return (
                <div key={story.id} className={`flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors ${hasIssue ? 'border-l-2 border-red-500' : hasPending ? 'border-l-2 border-amber-400' : ''}`}>
                  {story.coverUrl
                    ? <img src={story.coverUrl} alt={story.title} className="w-12 h-16 rounded-xl object-cover flex-shrink-0" />
                    : <div className="w-12 h-16 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center"><BookOpen className="w-5 h-5 text-muted-foreground" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/tac-gia/truyen/${story.id}`} className="font-bold text-sm hover:text-primary transition-colors line-clamp-1">{story.title}</Link>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sb.cls}`}>{sb.label}</span>
                      {hasIssue  && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600">{story.rejectedChapters} từ chối</span>}
                      {hasPending && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">{story.pendingChapters} chờ duyệt</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(story.viewCount)}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{story._count.chapters} chương</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{story._count.comments}</span>
                      <span className="flex items-center gap-1"><BookMarked className="w-3 h-3" />{story._count.bookmarks}</span>
                      <span className="flex items-center gap-1 text-amber-600"><Coins className="w-3 h-3" />{formatNumber(story.totalEarnings)} xu</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Xem truyện trang public */}
                    <Link href={`/truyen/${story.slug}`} target="_blank"
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Xem trang public">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                    <Link href={`/tac-gia/truyen/${story.id}/chuong`}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
                      Chương
                    </Link>
                    <Link href={`/tac-gia/truyen/${story.id}`}
                      className="px-3 py-1.5 rounded-lg gradient-primary text-white text-xs font-medium hover:opacity-90 transition-opacity">
                      Sửa
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
