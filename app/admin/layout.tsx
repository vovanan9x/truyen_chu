import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut, ChevronRight,
  CreditCard, MessageSquare, Tag, Globe, Wallet, ShieldCheck,
  FileCheck, Banknote, Database, AlertCircle, Home, Search, Rocket, Terminal, HardDrive
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: null, // no header for top-level
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Nội dung',
    items: [
      { href: '/admin/truyen', label: 'Quản lý truyện', icon: BookOpen },
      { href: '/admin/the-loai', label: 'Thể loại', icon: Tag },
      { href: '/admin/duyet-chuong', label: 'Duyệt chương', icon: FileCheck },
      { href: '/admin/binh-luan', label: 'Bình luận & Từ cấm', icon: MessageSquare },
      { href: '/admin/crawler', label: 'Crawl truyện', icon: Globe },
    ]
  },
  {
    label: 'Người dùng',
    items: [
      { href: '/admin/nguoi-dung', label: 'Quản lý user', icon: Users },
      { href: '/admin/nang-cap-tai-khoan', label: 'Duyệt Tác giả/DG', icon: ShieldCheck },
    ]
  },
  {
    label: 'Tài chính',
    items: [
      { href: '/admin/giao-dich', label: 'Giao dịch', icon: CreditCard },
      { href: '/admin/nap-xu', label: 'Yêu cầu nạp xu', icon: Wallet },
      { href: '/admin/rut-xu', label: 'Duyệt rút xu', icon: Banknote },
      { href: '/admin/cai-dat/thanh-toan', label: 'Thanh toán', icon: CreditCard },
    ]
  },
  {
    label: 'Hệ thống',
    items: [
      { href: '/admin/database', label: 'Database', icon: Database },
      { href: '/admin/backup', label: 'Backup & Restore', icon: HardDrive },
      { href: '/admin/loi-he-thong', label: 'Lỗi hệ thống', icon: AlertCircle },
      { href: '/admin/seo', label: 'Cài đặt SEO', icon: Search },
      { href: '/admin/cai-dat/chung', label: 'Cài đặt chung', icon: Settings },
      { href: '/admin/ops', label: 'VPS Operations', icon: Terminal },
      { href: '/admin/huong-dan-deploy', label: 'Hướng dẫn Deploy', icon: Rocket },
    ]
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/')

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm leading-tight">TruyenChu<br /><span className="text-[10px] font-normal text-muted-foreground">Admin Panel</span></span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'pt-3' : ''}>
              {group.label && (
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all group"
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-2 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted transition-colors">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {session.user.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate leading-tight">{session.user.name}</p>
              <p className="text-[10px] text-muted-foreground">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-border px-6 flex items-center justify-between bg-card flex-shrink-0">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />Site
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Admin</span>
          </nav>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <LogOut className="w-4 h-4" /> Về trang chủ
          </Link>
        </header>
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
