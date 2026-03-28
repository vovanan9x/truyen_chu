import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import Providers from '@/components/Providers'
import { getSiteSettings } from '@/lib/site-settings'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const domain = s.site_domain.replace(/\/$/, '')

  return {
    title: {
      default: `${s.site_name} - Đọc truyện chữ online`,
      template: `%s | ${s.site_name}`,
    },
    description: s.site_description,
    keywords: ['truyện chữ', 'đọc truyện online', 'truyện dịch', 'truyện tiên hiệp', 'truyện ngôn tình'],
    authors: [{ name: s.site_name }],
    robots: { index: true, follow: true },
    ...(s.site_favicon && {
      icons: {
        icon: s.site_favicon,
        shortcut: s.site_favicon,
        apple: s.site_favicon,
      },
    }),
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      url: domain || undefined,
      siteName: s.site_name,
    },
    metadataBase: domain ? new URL(domain) : undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSiteSettings()
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
