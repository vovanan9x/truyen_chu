import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/crawl/site-configs
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const configs = await prisma.siteConfig.findMany({ orderBy: { domain: 'asc' } })
  return NextResponse.json({ configs })
}

// POST /api/admin/crawl/site-configs
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  try {
    const body = await req.json()
    const { domain, name, titleSelector, authorSelector, coverSelector, descSelector,
      genreSelector, chapterListSel, storyListSel, chapterContentSel, chapterTitleSel, chapterTitleRegex,
      nextPageSel, chapterApiUrl, storyIdPattern, chapterApiJson,
      cookies, notes, isActive } = body

    if (!domain || !name) return NextResponse.json({ error: 'domain và name là bắt buộc' }, { status: 400 })

    const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim()

    const data = {
      name,
      titleSelector: titleSelector || null,
      authorSelector: authorSelector || null,
      coverSelector: coverSelector || null,
      descSelector: descSelector || null,
      genreSelector: genreSelector || null,
      chapterListSel: chapterListSel || null,
      storyListSel: storyListSel || null,
      chapterContentSel: chapterContentSel || null,
      chapterTitleSel: chapterTitleSel || null,
      chapterTitleRegex: chapterTitleRegex || null,
      nextPageSel: nextPageSel || null,
      chapterApiUrl: chapterApiUrl || null,
      storyIdPattern: storyIdPattern || null,
      chapterApiJson: chapterApiJson || null,
      cookies: cookies || null,
      notes: notes || null,
      isActive: isActive !== false,
    }

    const config = await prisma.siteConfig.upsert({
      where: { domain: normalizedDomain },
      create: { domain: normalizedDomain, ...data },
      update: data,
    })
    return NextResponse.json({ config })
  } catch (e: any) {
    console.error('[site-configs POST]', e)
    return NextResponse.json({ error: e?.message ?? 'Lỗi server' }, { status: 500 })
  }
}

// PATCH /api/admin/crawl/site-configs — update one
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  try {
    const { id, domain, name, titleSelector, authorSelector, coverSelector, descSelector,
      genreSelector, chapterListSel, storyListSel, chapterContentSel, chapterTitleSel, chapterTitleRegex,
      nextPageSel, chapterApiUrl, storyIdPattern, chapterApiJson,
      cookies, notes, isActive } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const data: Record<string, any> = {}
    if (name !== undefined) data.name = name
    if (titleSelector !== undefined) data.titleSelector = titleSelector || null
    if (authorSelector !== undefined) data.authorSelector = authorSelector || null
    if (coverSelector !== undefined) data.coverSelector = coverSelector || null
    if (descSelector !== undefined) data.descSelector = descSelector || null
    if (genreSelector !== undefined) data.genreSelector = genreSelector || null
    if (chapterListSel !== undefined) data.chapterListSel = chapterListSel || null
    if (storyListSel !== undefined) data.storyListSel = storyListSel || null
    if (chapterContentSel !== undefined) data.chapterContentSel = chapterContentSel || null
    if (chapterTitleSel !== undefined) data.chapterTitleSel = chapterTitleSel || null
    if (chapterTitleRegex !== undefined) data.chapterTitleRegex = chapterTitleRegex || null
    if (nextPageSel !== undefined) data.nextPageSel = nextPageSel || null
    if (chapterApiUrl !== undefined) data.chapterApiUrl = chapterApiUrl || null
    if (storyIdPattern !== undefined) data.storyIdPattern = storyIdPattern || null
    if (chapterApiJson !== undefined) data.chapterApiJson = chapterApiJson || null
    if (cookies !== undefined) data.cookies = cookies || null
    if (notes !== undefined) data.notes = notes || null
    if (isActive !== undefined) data.isActive = isActive

    const config = await prisma.siteConfig.update({ where: { id }, data })
    return NextResponse.json({ config })
  } catch (e: any) {
    console.error('[site-configs PATCH]', e)
    return NextResponse.json({ error: e?.message ?? 'Lỗi server' }, { status: 500 })
  }
}


// DELETE /api/admin/crawl/site-configs?id=...
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await prisma.siteConfig.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
