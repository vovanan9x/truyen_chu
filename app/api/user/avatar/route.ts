import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  // GIF không được phép (năng có thể là ảnh động)
}
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 })

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: `Định dạng không hỗ trợ. Chỉ chấp nhận: ${Object.values(ALLOWED_TYPES).map(e => e.replace('.', '').toUpperCase()).join(', ')}` },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File tối đa 2 MB' }, { status: 400 })
  }

  // Lấy avatar cũ trước khi overwrite
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatar: true },
  })

  const uploadDir = join(process.cwd(), 'public', 'avatars')
  await mkdir(uploadDir, { recursive: true })

  const filename = `${session.user.id}_${Date.now()}${ext}`
  const filepath = join(uploadDir, filename)

  const buffer = Buffer.from(await file.arrayBuffer())

  // Magic bytes check — ngăn file GIF giả mạo content-type
  // GIF header: "GIF87a" hoặc "GIF89a"
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return NextResponse.json({ error: 'Ảnh động (GIF) không được phép. Vui lòng dùng JPG, PNG hoặc WebP.' }, { status: 400 })
  }
  // WebP animated check: RIFF....WEBPVP8L or ANIM chunk
  if (file.type === 'image/webp') {
    const str = buffer.slice(0, 16).toString('ascii')
    if (str.startsWith('RIFF') && buffer.indexOf(Buffer.from('ANIM')) !== -1) {
      return NextResponse.json({ error: 'Ảnh WebP động không được phép.' }, { status: 400 })
    }
  }

  await writeFile(filepath, buffer)

  const avatarUrl = `/avatars/${filename}`

  // Lưu vào DB
  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar: avatarUrl },
  })

  // Xóa file avatar cũ sau khi lưu thành công (tránh disk đầy)
  if (user?.avatar && user.avatar.startsWith('/avatars/')) {
    const oldPath = join(process.cwd(), 'public', user.avatar)
    unlink(oldPath).catch(() => {}) // bỏ qua lỗi nếu file không tồn tại
  }

  return NextResponse.json({ success: true, avatarUrl })
}
