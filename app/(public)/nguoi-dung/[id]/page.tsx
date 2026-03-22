import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Calendar, MessageCircle, BookOpen, BookMarked, Star, Users, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { USER_LEVEL_NAMES, AUTHOR_LEVEL_NAMES, AUTHOR_LEVEL_THRESHOLDS } from '@/lib/xp'
import FollowButton from '@/components/user/FollowButton'
import dynamic from 'next/dynamic'
const UserProfileActions = dynamic(() => import('@/components/user/UserProfileActions'), { ssr: false })

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { name: true } })
  return { title: user ? `${user.name} - Trang cá nhân` : 'Trang cá nhân' }
}

export default async function UserProfilePage({ params }: Props) {
  const session = await auth()
  const isSelf = session?.user?.id === params.id

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: {
      id: true, displayId: true, name: true, avatar: true, bio: true, role: true, createdAt: true,
      xp: true, level: true, followerCount: true,
      gender: true, hometown: true, facebookUrl: true, tiktokUrl: true, instagramUrl: true,
      _count: { select: { comments: true, bookmarks: true, readingHistory: true, ratings: true } },
    } as any,
  }) as any

  if (!user) notFound()

  // Check if current user is following this author
  const isFollowing = session ? !!(await prisma.authorFollow.findUnique({
    where: { followerId_authorId: { followerId: session.user.id, authorId: params.id } }
  })) : false

  const [recentComments, bookmarks, ratings] = await Promise.all([
    prisma.comment.findMany({
      where: { userId: params.id }, take: 5, orderBy: { createdAt: 'desc' },
      include: { story: { select: { title: true, slug: true, coverUrl: true } } },
    }),
    prisma.bookmark.findMany({
      where: { userId: params.id }, take: 8, orderBy: { createdAt: 'desc' },
      include: { story: { select: { id: true, title: true, slug: true, coverUrl: true, author: true, _count: { select: { chapters: true } } } } },
    }),
    prisma.rating.findMany({
      where: { userId: params.id }, take: 5, orderBy: { updatedAt: 'desc' },
      include: { story: { select: { title: true, slug: true } } },
    }),
  ])

  const isAuthor = user.role === 'AUTHOR' || user.role === 'TRANSLATOR'
  const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-orange-400 to-rose-500', 'from-pink-500 to-rose-500']
  const color = colors[(user.name?.charCodeAt(0) ?? 0) % colors.length]

  // XP level progress
  const LEVEL_XP = [0, 100, 500, 1500, 5000, 15000, 50000]
  const currentLevelXP = LEVEL_XP[Math.min(user.level - 1, LEVEL_XP.length - 1)]
  const nextLevelXP = LEVEL_XP[Math.min(user.level, LEVEL_XP.length - 1)]
  const xpProgress = user.level >= 7 ? 100 : Math.round(((user.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
  const levelName = isAuthor
    ? AUTHOR_LEVEL_NAMES[Math.min(user.level - 1, AUTHOR_LEVEL_NAMES.length - 1)]
    : USER_LEVEL_NAMES[Math.min(user.level - 1, USER_LEVEL_NAMES.length - 1)]

  const stats = [
    { label: 'Bình luận', value: user._count.comments, icon: MessageCircle, color: 'text-blue-500' },
    { label: 'Theo dõi truyện', value: user._count.bookmarks, icon: BookMarked, color: 'text-rose-500' },
    { label: 'Đã đọc', value: user._count.readingHistory, icon: BookOpen, color: 'text-green-500' },
    { label: 'Đánh giá', value: user._count.ratings, icon: Star, color: 'text-amber-500' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Profile header */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex gap-5 items-center">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-3xl font-black shadow-lg flex-shrink-0`}>
            {user.avatar
              ? <img src={user.avatar} alt={user.name ?? ''} className="w-full h-full rounded-2xl object-cover"/>
              : (user.name?.[0]?.toUpperCase() ?? '?')
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{user.name || 'Người dùng ẩn danh'}</h1>
              {user.role === 'ADMIN' && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-sm">⚡ Admin</span>
              )}
              {isAuthor && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold">
                  {user.role === 'TRANSLATOR' ? '📖 Dịch giả' : '✍️ Tác giả'}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full gradient-primary text-white text-xs font-bold">
                Lv{user.level} · {levelName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5"/>Tham gia {formatDate(user.createdAt.toISOString())}
            </p>

            {/* displayId + giới tính + quê quán + social — cùng hàng */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <UserProfileActions userId={user.id} displayId={user.displayId} isSelf={isSelf}/>

              {user.gender && (
                <span className="flex items-center gap-0.5">
                  {user.gender === 'MALE' ? '👨 Nam' : user.gender === 'FEMALE' ? '👩 Nữ' : '⚧ Khác'}
                </span>
              )}

              {user.hometown && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3"/>{user.hometown}
                </span>
              )}

              {user.facebookUrl && (
                <a href={user.facebookUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#1877F2] hover:underline">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </a>
              )}

              {user.tiktokUrl && (
                <a href={user.tiktokUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:underline">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.53V6.77a4.85 4.85 0 01-1-.08z"/></svg>
                  TikTok
                </a>
              )}

              {user.instagramUrl && (
                <a href={user.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-pink-500 hover:underline">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  Instagram
                </a>
              )}
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 line-clamp-3">{user.bio}</p>
            )}
          </div>

          {/* Action buttons (right side) */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isAuthor && !isSelf && (
              <FollowButton authorId={user.id} initialFollowing={isFollowing} initialCount={user.followerCount}/>
            )}
          </div>
        </div>



        {/* XP / follower */}
        <div className="mt-4 flex flex-wrap gap-4 items-center">
          {isAuthor ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4"/>
              <span><strong className="text-foreground">{user.followerCount.toLocaleString()}</strong> người theo dõi</span>
            </div>
          ) : (
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{user.xp.toLocaleString()} XP</span>
                {user.level < 7 && <span>→ Lv{user.level + 1}</span>}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full gradient-primary rounded-full transition-all" style={{width:`${xpProgress}%`}}/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="p-5 rounded-2xl border border-border bg-card text-center hover:shadow-md transition-shadow">
              <Icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`}/>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Bookmarks */}
        <div className="space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-rose-500"/> Truyện đang theo dõi
          </h2>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa theo dõi truyện nào.</p>
          ) : (
            <div className="space-y-2">
              {bookmarks.map(b => (
                <Link key={b.story.id} href={`/truyen/${b.story.slug}`}
                  className="flex gap-3 p-3 rounded-xl hover:bg-muted transition-colors group">
                  {b.story.coverUrl
                    ? <img src={b.story.coverUrl} alt={b.story.title} className="w-10 h-14 rounded-lg object-cover flex-shrink-0"/>
                    : <div className="w-10 h-14 rounded-lg bg-muted flex-shrink-0"/>
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">{b.story.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{b.story.author} · {b.story._count.chapters} chương</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent comments */}
        <div className="space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500"/> Bình luận gần đây
          </h2>
          {recentComments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa có bình luận nào.</p>
          ) : (
            <div className="space-y-3">
              {recentComments.map(c => (
                <Link key={c.id} href={`/truyen/${c.story.slug}#binh-luan`}
                  className="block p-3 rounded-xl hover:bg-muted transition-colors group">
                  <p className="text-xs text-primary font-medium group-hover:underline">{c.story.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.content}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{formatDate(c.createdAt.toISOString())}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ratings */}
      {ratings.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500"/> Đánh giá của tôi
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ratings.map(r => (
              <Link key={r.storyId} href={`/truyen/${r.story.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted transition-all group">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i <= r.score ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}/>
                  ))}
                </div>
                <span className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">{r.story.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
