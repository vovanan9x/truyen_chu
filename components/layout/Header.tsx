'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import HeaderAuth from './HeaderAuth'
import SearchAutocomplete from './SearchAutocomplete'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

const navLinks = [
  { href: '/', label: 'Trang chủ' },
  { href: '/the-loai', label: 'Thể loại' },
  { href: '/bang-xep-hang', label: 'Xếp hạng' },
  { href: '/truyen-hoan-thanh', label: 'Hoàn thành' },
]

export default function Header({ siteName = 'TruyenChu', siteLogo = '', headerAdCode = '' }: { siteName?: string; siteLogo?: string; headerAdCode?: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 glass border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            {siteLogo ? (
              <img src={siteLogo} alt={siteName} className="h-9 max-w-[140px] object-contain group-hover:opacity-90 transition-opacity" />
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-gradient hidden sm:block">{siteName}</span>
              </>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  pathname === link.href
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <SearchAutocomplete />
            </div>
            <NotificationBell />
            <ThemeToggle />
            <HeaderAuth />

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1 animate-fade-in">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'block px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground/70 hover:text-foreground hover:bg-muted'
              )}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t">
            <HeaderAuth />
          </div>
        </div>
      )}
      {headerAdCode && (
        <div className="border-t" dangerouslySetInnerHTML={{ __html: headerAdCode }} />
      )}
    </header>
  )
}
