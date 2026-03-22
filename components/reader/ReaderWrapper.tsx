'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import ReaderContent from './ReaderContent'
import ReaderSettings from './ReaderSettings'
import ChapterLock from './ChapterLock'

interface ReaderWrapperProps {
  content: string
  isLocked: boolean
  coinCost: number
  storySlug: string
  chapterId: string
  storyId: string
  chapterNum: number
}

const STORAGE_KEY = 'truyen-reader-settings'

interface ReaderSettingsData {
  fontSize: number
  fontFamily: 'serif' | 'sans-serif'
  theme: 'light' | 'dark' | 'sepia'
}

const DEFAULT_SETTINGS: ReaderSettingsData = {
  fontSize: 17,
  fontFamily: 'serif',
  theme: 'light',
}

export default function ReaderWrapper({
  content,
  isLocked,
  coinCost,
  storySlug,
  chapterId,
  storyId,
  chapterNum,
}: ReaderWrapperProps) {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<ReaderSettingsData>(DEFAULT_SETTINGS)
  const [unlocked, setUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSettings(JSON.parse(saved))
    } catch {}
  }, [])

  // Check if chapter is already unlocked
  useEffect(() => {
    if (!session || !isLocked) return
    fetch(`/api/user/unlock?chapterId=${chapterId}`)
      .then((r) => r.json())
      .then((d) => { if (d.unlocked) setUnlocked(true) })
      .catch(() => {})
  }, [session, chapterId, isLocked])

  // Record reading history when user opens chapter
  useEffect(() => {
    if (!session) return
    fetch('/api/user/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, chapterId, chapterNum }),
    }).catch(() => {})
  }, [session, storyId, chapterId, chapterNum])

  // Apply theme to html element
  useEffect(() => {
    if (!mounted) return
    const html = document.documentElement
    html.classList.remove('dark', 'sepia')
    if (settings.theme === 'dark') html.classList.add('dark')
    if (settings.theme === 'sepia') html.classList.add('sepia')
  }, [settings.theme, mounted])

  const updateSettings = useCallback((partial: Partial<ReaderSettingsData>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleUnlock = useCallback(async () => {
    if (!session) {
      window.location.href = `/dang-nhap?callbackUrl=/truyen/${storySlug}/chuong/${chapterNum}`
      return
    }
    setUnlocking(true)
    setUnlockError('')
    try {
      const res = await fetch('/api/user/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId }),
      })
      const data = await res.json()
      if (res.ok) {
        setUnlocked(true)
      } else if (data.code === 'INSUFFICIENT_COINS') {
        setUnlockError('Không đủ xu! Vui lòng nạp thêm.')
      } else {
        setUnlockError(data.error || 'Lỗi khi mở khoá')
      }
    } catch {
      setUnlockError('Lỗi kết nối')
    } finally {
      setUnlocking(false)
    }
  }, [session, chapterId, storySlug, chapterNum])

  const showLocked = isLocked && !unlocked

  return (
    <>
      <ReaderContent
        content={content}
        isLocked={showLocked}
        fontSize={settings.fontSize}
        fontFamily={settings.fontFamily}
      />

      {showLocked && (
        <>
          {unlockError && (
            <div className="max-w-sm mx-auto mb-4 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center border border-destructive/20">
              {unlockError}
            </div>
          )}
          <ChapterLock
            coinCost={coinCost}
            storySlug={storySlug}
            chapterId={chapterId}
            onUnlock={handleUnlock}
            loading={unlocking}
          />
        </>
      )}

      <ReaderSettings
        fontSize={settings.fontSize}
        fontFamily={settings.fontFamily}
        theme={settings.theme}
        onFontSizeChange={(size) => updateSettings({ fontSize: size })}
        onFontFamilyChange={(family) => updateSettings({ fontFamily: family })}
        onThemeChange={(theme) => updateSettings({ theme })}
      />
    </>
  )
}
