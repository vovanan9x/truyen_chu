import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { spawn } from 'child_process'
import { join } from 'path'

// ─── Whitelist of allowed commands ────────────────────────────────────────────
// Each entry: { id, label, cmd, args, cwd? }
const ALLOWED_COMMANDS: Record<string, { cmd: string; args: string[]; cwd?: string }> = {
  'git-pull':         { cmd: 'git',  args: ['pull', 'origin', 'main'] },
  'npm-build':        { cmd: 'npm',  args: ['run', 'build'] },
  'pm2-status':       { cmd: 'pm2',  args: ['status'] },
  'pm2-restart':      { cmd: 'pm2',  args: ['restart', 'truyen-chu'] },
  'pm2-reload':       { cmd: 'pm2',  args: ['reload', 'truyen-chu'] },
  'pm2-logs':         { cmd: 'pm2',  args: ['logs', 'truyen-chu', '--lines', '80', '--nostream'] },
  'pm2-logs-error':   { cmd: 'pm2',  args: ['logs', 'truyen-chu', '--err', '--lines', '50', '--nostream'] },
  'nginx-test':       { cmd: 'sudo', args: ['nginx', '-t'] },
  'nginx-reload':     { cmd: 'sudo', args: ['nginx', '-s', 'reload'] },
  'disk-usage':       { cmd: 'df',   args: ['-h'] },
  'mem-usage':        { cmd: 'free', args: ['-h'] },
  'clear-next-cache': { cmd: 'rm',   args: ['-rf', '.next/cache'] },
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { commandId } = await req.json()
  const def = ALLOWED_COMMANDS[commandId]
  if (!def) {
    return NextResponse.json({ error: 'Lệnh không được phép' }, { status: 400 })
  }

  const cwd = def.cwd ?? process.cwd()

  // Stream output via SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string, type = 'log') => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`))
        } catch { /* ignore if closed */ }
      }

      send(`$ ${def.cmd} ${def.args.join(' ')}`, 'cmd')
      send(`📁 CWD: ${cwd}`, 'info')

      const proc = spawn(def.cmd, def.args, {
        cwd,
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: false,
      })

      proc.stdout.on('data', (chunk: Buffer) => {
        chunk.toString().split('\n').forEach(line => {
          if (line.trim()) send(line)
        })
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        chunk.toString().split('\n').forEach(line => {
          if (line.trim()) send(line, 'err')
        })
      })

      proc.on('close', (code) => {
        send(`\n✅ Hoàn thành (exit code: ${code})`, code === 0 ? 'success' : 'err')
        try { controller.enqueue(encoder.encode('data: {"type":"done"}\n\n')) } catch { /* ignore */ }
        try { controller.close() } catch { /* ignore */ }
      })

      proc.on('error', (e) => {
        send(`❌ Lỗi: ${e.message}`, 'err')
        try { controller.enqueue(encoder.encode('data: {"type":"done"}\n\n')) } catch { /* ignore */ }
        try { controller.close() } catch { /* ignore */ }
      })

      // Kill after 5 min timeout
      const timeout = setTimeout(() => {
        proc.kill()
        send('⏰ Timeout 5 phút — process bị kill', 'err')
        try { controller.enqueue(encoder.encode('data: {"type":"done"}\n\n')) } catch { /* ignore */ }
        try { controller.close() } catch { /* ignore */ }
      }, 300_000)

      proc.on('exit', () => clearTimeout(timeout))
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',  // disable nginx buffering
      'Connection': 'keep-alive',
    },
  })
}

// GET — return list of available commands
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  return NextResponse.json({ commands: Object.keys(ALLOWED_COMMANDS) })
}
