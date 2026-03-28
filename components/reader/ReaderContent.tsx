'use client'

import sanitizeHtml from 'sanitize-html'

interface ReaderContentProps {
  content: string
  isLocked: boolean
  fontSize: number
  fontFamily: 'serif' | 'sans-serif'
}

// Fix #4: Sanitize HTML content from crawled sources — allow safe tags only
const ALLOWED_TAGS = ['p', 'br', 'div', 'span', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote']
const ALLOWED_ATTRS = { '*': ['class'] } // only allow class attribute

function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    disallowedTagsMode: 'discard',
  })
}

// Detect if content is HTML or plain text
function isHtmlContent(content: string): boolean {
  return /\<(p|br|div|span|strong|em|h[1-6]|ul|ol|li|blockquote)[\s>\/]/i.test(content)
}

// Split plain text into paragraphs
function toPlainParagraphs(content: string): string[] {
  return content.split('\n').filter((p) => p.trim() !== '')
}

export default function ReaderContent({ content, isLocked, fontSize, fontFamily }: ReaderContentProps) {
  const isHtml = isHtmlContent(content)

  const fontStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontFamily: fontFamily === 'serif' ? 'var(--font-serif), Georgia, serif' : 'var(--font-sans), system-ui, sans-serif',
    lineHeight: '1.9',
  }

  if (isHtml) {
    const totalLen = content.length
    const previewLen = isLocked ? Math.ceil(totalLen * 0.2) : totalLen

    // Fix #4: Sanitize before rendering — strip scripts, iframes, onclick, etc.
    const cleanContent = sanitize(content)
    const previewHtml = cleanContent.slice(0, previewLen)
    const lockedHtml = isLocked ? cleanContent.slice(previewLen) : ''

    return (
      <div className="relative">
        <div
          className="prose-reader chapter-html-content"
          style={fontStyle}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        {isLocked && lockedHtml && (
          <div className="relative">
            <div
              className="select-none pointer-events-none blur-sm opacity-50"
              dangerouslySetInnerHTML={{ __html: lockedHtml.slice(0, 2000) }}
              style={fontStyle}
            />
            <div className="absolute inset-0 chapter-lock-blur" />
          </div>
        )}
      </div>
    )
  }

  // Plain text (legacy): split by newline
  const paragraphs = toPlainParagraphs(content)
  const preview = isLocked ? paragraphs.slice(0, Math.ceil(paragraphs.length * 0.2)) : paragraphs
  const locked = isLocked ? paragraphs.slice(Math.ceil(paragraphs.length * 0.2)) : []

  return (
    <div className="relative">
      <div className="prose-reader" style={fontStyle}>
        {preview.map((p, i) => (
          <p key={i} className="mb-5 text-foreground/90 leading-relaxed">
            {p}
          </p>
        ))}

        {isLocked && locked.length > 0 && (
          <div className="relative">
            <div className="select-none pointer-events-none">
              {locked.slice(0, 5).map((p, i) => (
                <p key={i} className="mb-5 text-foreground/90 leading-relaxed blur-sm opacity-50">
                  {p}
                </p>
              ))}
            </div>
            <div className="absolute inset-0 chapter-lock-blur" />
          </div>
        )}
      </div>
    </div>
  )
}
