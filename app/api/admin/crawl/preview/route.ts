import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAdapterWithDbConfig, fetchUrl } from '@/lib/crawl-adapters'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 })

  const { adapter } = await getAdapterWithDbConfig(url)
  let html: string

  try {
    html = await fetchUrl(url, 15000)
  } catch (e: any) {
    const msg = e?.name === 'TimeoutError'
      ? 'Site phản hồi quá chậm (timeout 15s)'
      : `Không thể kết nối: ${e?.message}`
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const info = adapter.fetchStoryInfo(url, html)
    if (!info.title) {
      return NextResponse.json({ error: `Adapter ${adapter.name} không đọc được thông tin truyện. Site có thể đã thay đổi HTML.` }, { status: 400 })
    }

    let chapters = adapter.fetchChapterList(url, html).chapters

    // If adapter has AJAX/smart fetcher, always use it for most accurate chapter list
    if (adapter.fetchAllChapters) {
      chapters = await adapter.fetchAllChapters(url, html)
    }

    // Update totalChapters from actual chapter list if more accurate
    if (chapters.length > info.totalChapters) {
      info.totalChapters = chapters.length
    }

    return NextResponse.json({
      adapterName: adapter.name,
      ...info,
      previewChapters: chapters.slice(0, 10),
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Lỗi parse: ${e?.message}` }, { status: 400 })
  }
}
