'use client'

import { useState } from 'react'
import { Copy, Check, SendHorizonal, Hash } from 'lucide-react'
import dynamic from 'next/dynamic'

const CoinTransferModal = dynamic(() => import('./CoinTransferModal'), { ssr: false })

interface Props { userId: string; displayId: number; isSelf: boolean }

export default function UserProfileActions({ userId, displayId, isSelf }: Props) {
  const [copied, setCopied] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  function copyId() {
    navigator.clipboard.writeText(String(displayId)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
      {/* Hiển thị ID số ngắn + nút copy */}
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-xs font-mono">
        <Hash className="w-3 h-3"/>
        {displayId}
        <button onClick={copyId} title="Copy ID" className="ml-0.5 hover:text-foreground transition-colors">
          {copied ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
        </button>
      </span>

      {/* Nút chuyển xu — chỉ hiện nếu không phải chính mình */}
      {!isSelf && (
        <button onClick={() => setShowTransfer(true)}
          className="ml-1 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium hover:opacity-80 transition-opacity">
          <SendHorizonal className="w-3 h-3"/>Gửi xu
        </button>
      )}

      {showTransfer && <CoinTransferModal onClose={() => setShowTransfer(false)}/>}
    </>
  )
}
