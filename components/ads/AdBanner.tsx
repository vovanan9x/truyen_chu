'use client'

import { useEffect, useRef } from 'react'

interface AdBannerProps {
  /** Raw HTML/JS code từ admin settings */
  code: string
  className?: string
  label?: string // accessibility label, default 'Quảng cáo'
}

// Fix #3: Allowed external ad domains — restrict script src to known ad networks
const ALLOWED_AD_SOURCES = [
  'googletagmanager.com',
  'googlesyndication.com',
  'doubleclick.net',
  'google.com',
  'gstatic.com',
  'adsbygoogle.js',
  // Add more trusted ad network domains here
]

function isAllowedScriptSrc(src: string): boolean {
  if (!src) return true // inline scripts are allowed (admin-controlled)
  try {
    const host = new URL(src).hostname
    return ALLOWED_AD_SOURCES.some(d => host.endsWith(d))
  } catch {
    return false
  }
}

/**
 * Render arbitrary HTML/JS ad code from admin-only settings.
 * Fix #3: Script src is validated against allowed ad networks.
 * dangerouslySetInnerHTML không execute <script> tags nên phải inject thủ công.
 */
export default function AdBanner({ code, className = '', label = 'Quảng cáo' }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !code) return

    // Inject HTML
    container.innerHTML = code

    // Execute script tags manually — validate src before injecting
    const scripts = container.querySelectorAll('script')
    scripts.forEach(oldScript => {
      const src = oldScript.getAttribute('src') ?? ''
      if (src && !isAllowedScriptSrc(src)) {
        console.warn('[AdBanner] Blocked script from untrusted source:', src)
        oldScript.remove()
        return
      }
      const newScript = document.createElement('script')
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
