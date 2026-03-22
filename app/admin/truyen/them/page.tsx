import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import AdminAddStoryForm from './AdminAddStoryForm'

export const metadata: Metadata = { title: 'Thêm truyện mới' }

export default async function AddStoryPage() {
  const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/truyen" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
        <h1 className="text-2xl font-bold">Thêm truyện mới</h1>
      </div>
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm">
        <AdminAddStoryForm genres={genres} />
      </div>
    </div>
  )
}
