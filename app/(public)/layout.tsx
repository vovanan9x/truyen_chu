import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { getSiteSettings, isAdEnabled, getAdCode } from '@/lib/site-settings'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const s = await getSiteSettings()
  const headerAdCode = isAdEnabled(s, 'header') ? getAdCode(s, 'header') : ''

  return (
    <div className="min-h-screen flex flex-col">
      <Header siteName={s.site_name} siteLogo={s.site_logo} headerAdCode={headerAdCode} />
      <main className="flex-1">{children}</main>
      <Footer siteName={s.site_name} />
    </div>
  )
}
