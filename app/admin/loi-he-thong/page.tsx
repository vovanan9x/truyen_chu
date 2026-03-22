import { Metadata } from 'next'
import ErrorLogManager from './ErrorLogManager'

export const metadata: Metadata = { title: 'Nhật ký lỗi hệ thống' }

export default function ErrorLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">🛡️ Nhật ký lỗi hệ thống</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Theo dõi và xử lý các lỗi xảy ra trong ứng dụng</p>
      </div>
      <ErrorLogManager />
    </div>
  )
}
