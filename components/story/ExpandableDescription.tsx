'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const COLLAPSE_LINES = 4 // số dòng hiển thị khi thu gọn

export default function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)

  // Estimate if text is long enough to need truncation
  // ~80 chars/line * 4 lines = 320 chars threshold
  const isLong = text.length > 320 || text.split('\n').length > COLLAPSE_LINES

  return (
    <div>
      <p
        className={`text-foreground/80 leading-relaxed whitespace-pre-line transition-all ${
          !expanded && isLong ? 'line-clamp-4' : ''
        }`}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3.5 h-3.5" />Thu gọn</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" />Xem thêm</>
          )}
        </button>
      )}
    </div>
  )
}
