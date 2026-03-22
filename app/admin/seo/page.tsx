import { Metadata } from 'next'
import { Search } from 'lucide-react'
import SeoSettingsClient from './SeoSettingsClient'

export const metadata: Metadata = { title: 'Cài đặt SEO' }

export default function AdminSeoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6"/>Cài đặt SEO
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tuỳ chỉnh tiêu đề, mô tả các trang hiển thị trên Google và mạng xã hội
        </p>
      </div>
      <SeoSettingsClient />
    </div>
  )
}
