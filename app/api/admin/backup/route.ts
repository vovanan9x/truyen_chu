import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { spawn } from 'child_process'
import { mkdir, readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'

const BACKUP_DIR = join(process.cwd(), 'backups')

/** Parse DATABASE_URL into pg connection parts */
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

async function ensureBackupDir() {
  await mkdir(BACKUP_DIR, { recursive: true })
}

// GET — list backup files
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureBackupDir()

  const files = await readdir(BACKUP_DIR)
  const backups = await Promise.all(
    files
      .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'))
      .map(async (name) => {
        const s = await stat(join(BACKUP_DIR, name))
        return { name, size: s.size, createdAt: s.mtime.toISOString() }
      })
  )
  backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return NextResponse.json({ backups })
}

// POST — create new backup using pg_dump
export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await ensureBackupDir()

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return NextResponse.json({ error: 'DATABASE_URL không được cấu hình' }, { status: 500 })

  const db = parseDbUrl(dbUrl)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `backup_${timestamp}.sql`
  const filepath = join(BACKUP_DIR, filename)

  return new Promise<NextResponse>((resolve) => {
    const env = { ...process.env, PGPASSWORD: db.password }

    const args = [
      '-h', db.host,
      '-p', db.port,
      '-U', db.user,
      '-d', db.database,
      '--no-password',
      '--clean',           // DROP antes de CREATE (safe restore)
      '--if-exists',
      '--format=plain',
      '--file', filepath,
    ]

    const proc = spawn('pg_dump', args, { env })

    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    proc.on('close', async (code) => {
      if (code !== 0) {
        resolve(NextResponse.json({
          error: `pg_dump thất bại (exit ${code}): ${stderr.slice(0, 300)}`
        }, { status: 500 }))
        return
      }
      const s = await stat(filepath)
      resolve(NextResponse.json({
        success: true,
        backup: { name: filename, size: s.size, createdAt: s.mtime.toISOString() }
      }))
    })

    proc.on('error', (err: Error) => {
      resolve(NextResponse.json({
        error: `Không tìm thấy pg_dump: ${err.message}. Đảm bảo PostgreSQL đã cài và pg_dump có trong PATH.`
      }, { status: 500 }))
    })
  })
}

// DELETE — xóa file backup
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const name = req.nextUrl.searchParams.get('file')
  if (!name || !/^[\w\-.]+$/.test(name))
    return NextResponse.json({ error: 'Tên file không hợp lệ' }, { status: 400 })

  const filepath = join(BACKUP_DIR, name)
  await unlink(filepath)
  return NextResponse.json({ success: true })
}
