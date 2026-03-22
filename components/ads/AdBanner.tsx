'use client'

import { useEffect, useRef } from 'react'

interface AdBannerProps {
  /** Raw HTML/JS code từ admin settings */
  code: string
  className?: string
  label?: string // accessibility label, default 'Quảng cáo'
}

/**
 * Render arbitrary HTML/JS ad code.
 * dangerouslySetInnerHTML không execute <script> tags nên phải inject thủ công.
 */
export default function AdBanner({ code, className = '', label = 'Quảng cáo' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !code) return

    // Inject HTML
    container.innerHTML = code

    // Execute script tags manually (dangerouslySetInnerHTML không chạy script)
    const scripts = container.querySelectorAll('script')
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script')
      // Copy attributes (src, type, async, crossOrigin, etc.)
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value))
      newScript.textContent = oldScript.textContent
      oldScript.parentNode?.replaceChild(newScript, oldScript)
    })

    // Cleanup khi component unmount
    return () => { if (container) container.innerHTML = '' }
  }, [code])

  if (!code?.trim()) return null

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      aria-label={label}
      data-ad-slot
    />
  )
}
