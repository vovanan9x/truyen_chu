'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" /> // prevent hydration flash

  const CYCLE: Record<string, string> = {
    dark: 'light',
    light: 'sepia',
    sepia: 'dark',
  }

  const ICONS: Record<string, React.ReactNode> = {
    dark:  <Moon className="w-4 h-4" />,
    light: <Sun className="w-4 h-4" />,
    sepia: <BookOpen className="w-4 h-4" />,
  }

  const LABELS: Record<string, string> = {
    dark: 'Tối', light: 'Sáng', sepia: 'Sepia',
  }

  const current = theme ?? 'dark'
  const next = CYCLE[current] ?? 'dark'

  return (
    <button
      onClick={() => setTheme(next)}
      title={`Chuyển sang chế độ ${LABELS[next]}`}
      className="p-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Chuyển đổi giao diện"
    >
      {ICONS[current]}
    </button>
  )
}
