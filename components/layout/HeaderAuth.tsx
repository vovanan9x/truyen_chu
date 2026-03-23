'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useRef, useEffect } from 'react'
import { User, BookMarked, Clock, Coins, LogOut, ChevronDown, Settings, List } from 'lucide-react'

export default function HeaderAuth() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (status === 'loading') {
    return <div className="w-24 h-9 rounded-lg bg-muted animate-pulse" />
  }

  if (!session) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link href="/dang-nhap" className="px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted rounded-lg transition-colors whitespace-nowrap">
          Đăng nhập
        </Link>
        <Link href="/dang-ky" className="px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white rounded-lg gradient-primary hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap">
          Đăng ký
        </Link>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted transition-colors"
      >
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
          {session.user.name?.[0]?.toUpperCase() ?? <User className="w-4 h-4" />}
        </div>
        <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
          {session.user.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border bg-card shadow-xl z-50 py-2 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm truncate">{session.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
          </div>

          <div className="py-1">
            <Link href={`/nguoi-dung/${session.user.id}`} onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <User className="w-4 h-4 text-muted-foreground" /> Hồ sơ của tôi
            </Link>
            <Link href="/nguoi-dung/chinh-sua" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <Settings className="w-4 h-4 text-muted-foreground" /> Chỉnh sửa hồ sơ
            </Link>
            <Link href="/tai-khoan/bookmark" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <BookMarked className="w-4 h-4 text-muted-foreground" /> Theo dõi
            </Link>
            <Link href="/tai-khoan/danh-sach" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <List className="w-4 h-4 text-muted-foreground" /> Danh sách đọc
            </Link>
            <Link href="/tai-khoan/lich-su" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <Clock className="w-4 h-4 text-muted-foreground" /> Lịch sử đọc
            </Link>
            <Link href="/nap-coin" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Nạp xu</span>
            </Link>
            {/* Dashboard link cho tác giả/dịch giả */}
            {session.user.role === 'AUTHOR' && (
              <Link href="/tac-gia" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-violet-600 dark:text-violet-400">
                <Settings className="w-4 h-4" /> Dashboard Tác giả
              </Link>
            )}
            {session.user.role === 'TRANSLATOR' && (
              <Link href="/dich-gia" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-blue-600 dark:text-blue-400">
                <Settings className="w-4 h-4" /> Dashboard Dịch giả
              </Link>
            )}
            {(session.user.role === 'AUTHOR' || session.user.role === 'TRANSLATOR') && (
              <Link href="/rut-xu" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-emerald-600 dark:text-emerald-400">
                <Coins className="w-4 h-4" /> Rút xu
              </Link>
            )}
            {session.user.role === 'READER' && (
              <Link href="/yeu-cau-nang-cap" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-orange-600 dark:text-orange-400">
                <User className="w-4 h-4" /> Trở thành Tác giả/Dịch giả
              </Link>
            )}
            {session.user.role === 'ADMIN' && (
              <Link href="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-primary">
                <Settings className="w-4 h-4" /> Quản trị
              </Link>
            )}
          </div>

          <div className="border-t border-border py-1">
            <button onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors">
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
