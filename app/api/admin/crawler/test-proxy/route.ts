import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/permissions'

// POST /api/admin/crawler/test-proxy
// Body: { host, port, user, pass }
// Tests proxy by fetching https://httpbin.io/ip and returning the detected IP
export async function POST(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { host, port, user, pass } = await req.json()
  if (!host) return NextResponse.json({ error: 'Thiếu proxy host' }, { status: 400 })

  const proxyUrl = (user && pass)
    ? `http://${user}:${pass}@${host}:${port || 10000}`
    : `http://${host}:${port || 10000}`

  try {
    const { fetch: undiciFetch, ProxyAgent } = await import('undici')
    const agent = new ProxyAgent(proxyUrl)

    const res = await (undiciFetch as any)('https://httpbin.io/ip', {
      dispatcher: agent,
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProxyTest/1.0)',
      },
    })
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `HTTP ${res.status}` })
    }
    const data = await res.json() as { origin?: string }
    return NextResponse.json({ ok: true, ip: data.origin ?? 'unknown' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Lỗi kết nối' })
  }
}
