import { NextResponse } from 'next/server'

// Redirect /sitemap.xml → /sitemap-index.xml
export async function GET() {
  return NextResponse.redirect(
    new URL('/sitemap-index', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    { status: 301 }
  )
}
