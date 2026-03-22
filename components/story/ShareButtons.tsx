'use client'

import { useState } from 'react'
import { Share2, Facebook, Twitter, Link2, Check } from 'lucide-react'

interface ShareButtonsProps {
  title: string
  slug: string // e.g. "ten-truyen"
}

export default function ShareButtons({ title, slug }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  // Build absolute URL from slug — always use window.location.origin on client
  const getUrl = () => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/truyen/${slug}`
  }

  function handleFacebook() {
    const url = getUrl()
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400')
    setOpen(false)
  }

  function handleTwitter() {
    const url = getUrl()
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank', 'width=600,height=400')
    setOpen(false)
  }

  function copyLink() {
    const url = getUrl()
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium"
      >
        <Share2 className="w-4 h-4" /> Chia sẻ
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-2xl p-2 flex flex-col gap-1 min-w-[200px]">
            <button onClick={handleFacebook}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-sm w-full text-left">
              <Facebook className="w-4 h-4 text-blue-500" /> Chia sẻ Facebook
            </button>
            <button onClick={handleTwitter}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-sm w-full text-left">
              <Twitter className="w-4 h-4 text-sky-400" /> Chia sẻ Twitter
            </button>
            <button onClick={copyLink}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-sm w-full text-left">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4 text-muted-foreground" />}
              {copied ? 'Đã sao chép!' : 'Sao chép link'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
