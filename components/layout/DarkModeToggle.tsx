'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  if (!mounted) return <div className="w-9 h-9" />

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
      title={dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  )
}
