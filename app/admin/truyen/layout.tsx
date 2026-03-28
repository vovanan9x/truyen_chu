import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Quản lý truyện' }

export default function StoriesLayout({ children }: { children: React.ReactNode }) {
  return children
}
