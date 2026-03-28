import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

function parseDbUrl(url: string) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  }
}

// POST /api/admin/restore — upload .sql file and restore
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return NextResponse.json({ error: 'DATABASE_URL không được cấu hình' }, { status: 500 })

  let tmpFile: string | null = null
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const confirm = formData.get('confirm') as string

    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 })
    if (confirm !== 'RESTORE') return NextResponse.json({ error: 'Thiếu xác nhận RESTORE' }, { status: 400 })
    if (!file.name.endsWith('.sql') && !file.name.endsWith('.sql.gz'))
      return NextResponse.json({ error: 'Chỉ chấp nhận file .sql hoặc .sql.gz' }, { status: 400 })

    // Save to temp file
    const bytes = await file.arrayBuffer()
    tmpFile = join(tmpdir(), `restore_${randomUUID()}.sql`)
    await writeFile(tmpFile, Buffer.from(bytes))

    const db = parseDbUrl(dbUrl)
    const env = { ...process.env, PGPASSWORD: db.password }
    const args = ['-h', db.host, '-p', db.port, '-U', db.user, '-d', db.database, '--no-password', '-f', tmpFile]

    return await new Promise<NextResponse>((resolve) => {
      const proc = spawn('psql', args, { env })
      let stderr = ''
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

      proc.on('close', async (code) => {
        if (tmpFile) await unlink(tmpFile).catch(() => {})
        if (code !== 0) {
          resolve(NextResponse.json({ error: `psql thất bại (exit ${code}): ${stderr.slice(0, 500)}` }, { status: 500 }))
        } else {
          resolve(NextResponse.json({ success: true, message: 'Restore hoàn tất' }))
        }
      })

      proc.on('error', async (err: Error) => {
        if (tmpFile) await unlink(tmpFile).catch(() => {})
        resolve(NextResponse.json({
          error: `Không tìm thấy psql: ${err.message}. Đảm bảo PostgreSQL đã cài và psql có trong PATH.`
        }, { status: 500 }))
      })
    })
  } catch (e: any) {
    if (tmpFile) await unlink(tmpFile).catch(() => {})
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
