'use client'

import { Lock, Coins, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ChapterLockProps {
  coinCost: number
  storySlug: string
  chapterId: string
  onUnlock?: () => void
  loading?: boolean
}

export default function ChapterLock({ coinCost, storySlug, chapterId, onUnlock, loading }: ChapterLockProps) {
  return (
    <div className="my-8 flex justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-8 text-center space-y-5 shadow-lg">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">Chương VIP</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Chương này cần {coinCost} coin để mở khoá
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onUnlock}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md disabled:opacity-60"
          >
            <Coins className="w-4 h-4" />
            {loading ? 'Đang mở khoá...' : `Mở khoá (${coinCost} coin)`}
          </button>
          <Link
            href="/nap-coin"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-medium text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            Nạp thêm coin
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
          Sau khi mở khoá, bạn có thể đọc mãi mãi
        </p>
      </div>
    </div>
  )
}
