import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createReadStream, existsSync } from 'fs'
import { join } from 'path'
import { Readable } from 'stream'
import { ReadableStream as WebReadableStream } from 'stream/web'

const BACKUP_DIR = join(process.cwd(), 'backups')

// GET /api/admin/backup/download?file=backup_xxx.sql
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const name = req.nextUrl.searchParams.get('file')
  if (!name || !/^[\w\-.]+$/.test(name))
    return NextResponse.json({ error: 'Tên file không hợp lệ' }, { status: 400 })

  const filepath = join(BACKUP_DIR, name)
  if (!existsSync(filepath))
    return NextResponse.json({ error: 'File không tồn tại' }, { status: 404 })

  const nodeStream = createReadStream(filepath)
  const webStream = Readable.toWeb(nodeStream) as WebReadableStream<Uint8Array>

  const contentType = name.endsWith('.gz') ? 'application/gzip' : 'application/sql'
  return new Response(webStream as any, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  })
}
