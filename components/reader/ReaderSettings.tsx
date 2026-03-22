'use client'

import { useState, useCallback, useEffect } from 'react'
import { Settings, Sun, Moon, Coffee, Type, Minus, Plus, X } from 'lucide-react'

interface ReaderSettingsProps {
  fontSize: number
  fontFamily: 'serif' | 'sans-serif'
  theme: 'light' | 'dark' | 'sepia'
  onFontSizeChange: (size: number) => void
  onFontFamilyChange: (family: 'serif' | 'sans-serif') => void
  onThemeChange: (theme: 'light' | 'dark' | 'sepia') => void
}

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Sáng', icon: Sun, bg: 'bg-white', border: 'border-gray-300' },
  { value: 'dark' as const, label: 'Tối', icon: Moon, bg: 'bg-gray-900', border: 'border-gray-700' },
  { value: 'sepia' as const, label: 'Sepia', icon: Coffee, bg: 'bg-amber-50', border: 'border-amber-300' },
]

export default function ReaderSettings({
  fontSize,
  fontFamily,
  theme,
  onFontSizeChange,
  onFontFamilyChange,
  onThemeChange,
}: ReaderSettingsProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-4 z-50 p-3 rounded-full glass shadow-lg hover:bg-muted transition-colors border border-border/60"
        aria-label="Cài đặt đọc"
      >
        <Settings className="w-5 h-5 text-foreground/70" />
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed bottom-36 right-4 z-50 w-72 glass rounded-2xl shadow-2xl border border-border/60 p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-sm">Tùy chỉnh đọc</h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Font family */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Kiểu chữ</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onFontFamilyChange('serif')}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    fontFamily === 'serif'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border hover:bg-muted'
                  }`}
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Serif
                </button>
                <button
                  onClick={() => onFontFamilyChange('sans-serif')}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    fontFamily === 'sans-serif'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  Sans
                </button>
              </div>
            </div>

            {/* Font size */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Cỡ chữ: {fontSize}px
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onFontSizeChange(Math.max(14, fontSize - 1))}
                  disabled={fontSize <= 14}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min={14}
                  max={22}
                  value={fontSize}
                  onChange={(e) => onFontSizeChange(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <button
                  onClick={() => onFontSizeChange(Math.min(22, fontSize + 1))}
                  disabled={fontSize >= 22}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Giao diện</label>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((t) => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.value}
                      onClick={() => onThemeChange(t.value)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all ${
                        theme === t.value
                          ? 'border-primary'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border ${t.bg} ${t.border} flex items-center justify-center`}>
                        <Icon className="w-3 h-3 text-gray-600" />
                      </div>
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
