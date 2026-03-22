import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Chỉ chấp nhận file ảnh' }, { status: 400 })
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ảnh tối đa 5MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${randomUUID()}.${ext}`
  const uploadDir = join(process.cwd(), 'public', 'uploads')

  await mkdir(uploadDir, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(join(uploadDir, filename), Buffer.from(bytes))

  return NextResponse.json({ url: `/uploads/${filename}` })
}
