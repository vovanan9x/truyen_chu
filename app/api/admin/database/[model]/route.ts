import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Danh sách model được phép thao tác và các field hiển thị/chỉnh sửa
const ALLOWED_MODELS: Record<string, {
  label: string
  listFields: string[]
  editFields: string[]
  createFields: string[]
  searchField?: string
  orderBy?: any
}> = {
  user: {
    label: 'Người dùng',
    listFields: ['id', 'name', 'email', 'role', 'coinBalance', 'level', 'isBanned', 'createdAt'],
    editFields: ['name', 'email', 'role', 'coinBalance', 'level', 'xp', 'bio'],
    createFields: ['name', 'email', 'role'],
    searchField: 'email',
    orderBy: { createdAt: 'desc' },
  },
  story: {
    label: 'Truyện',
    listFields: ['id', 'title', 'slug', 'author', 'status', 'viewCount', 'isFeatured', 'updatedAt'],
    editFields: ['title', 'slug', 'author', 'status', 'description', 'isFeatured', 'isPublished'],
    createFields: ['title', 'slug', 'author', 'status'],
    searchField: 'title',
    orderBy: { updatedAt: 'desc' },
  },
  chapter: {
    label: 'Chương',
    listFields: ['id', 'chapterNum', 'title', 'isLocked', 'price', 'viewCount', 'storyId', 'createdAt'],
    editFields: ['chapterNum', 'title', 'isLocked', 'price', 'isPublished'],
    createFields: ['storyId', 'chapterNum', 'title'],
    orderBy: { createdAt: 'desc' },
  },
  comment: {
    label: 'Bình luận',
    listFields: ['id', 'content', 'likeCount', 'isPinned', 'userId', 'storyId', 'createdAt'],
    editFields: ['content', 'isPinned'],
    createFields: [],
    orderBy: { createdAt: 'desc' },
  },
  genre: {
    label: 'Thể loại',
    listFields: ['id', 'name', 'slug', 'description'],
    editFields: ['name', 'slug', 'description'],
    createFields: ['name', 'slug', 'description'],
    searchField: 'name',
    orderBy: { name: 'asc' },
  },
  bannedWord: {
    label: 'Từ cấm',
    listFields: ['id', 'word', 'isActive', 'hitCount', 'createdAt'],
    editFields: ['word', 'isActive'],
    createFields: ['word'],
    searchField: 'word',
    orderBy: { hitCount: 'desc' },
  },
  crawlSchedule: {
    label: 'Lịch crawl',
    listFields: ['id', 'name', 'url', 'isActive', 'cronExpression', 'lastRunAt'],
    editFields: ['name', 'url', 'isActive', 'cronExpression'],
    createFields: ['name', 'url', 'cronExpression'],
    orderBy: { createdAt: 'desc' },
  },
  notification: {
    label: 'Thông báo',
    listFields: ['id', 'message', 'type', 'isRead', 'userId', 'createdAt'],
    editFields: ['isRead'],
    createFields: [],
    orderBy: { createdAt: 'desc' },
  },
  transaction: {
    label: 'Giao dịch',
    listFields: ['id', 'type', 'amount', 'description', 'userId', 'createdAt'],
    editFields: [],
    createFields: [],
    orderBy: { createdAt: 'desc' },
  },
  errorLog: {
    label: 'Lỗi hệ thống',
    listFields: ['id', 'level', 'message', 'path', 'resolved', 'createdAt'],
    editFields: ['resolved'],
    createFields: [],
    orderBy: { createdAt: 'desc' },
  },
}

function getModel(name: string) {
  return (prisma as any)[name]
}

// GET /api/admin/database/[model]?page=1&q=search
export async function GET(req: NextRequest, { params }: { params: { model: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modelName = params.model
  const config = ALLOWED_MODELS[modelName]
  if (!config) return NextResponse.json({ error: 'Model không hợp lệ' }, { status: 400 })

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'))
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const PER_PAGE = 20

  const where = q && config.searchField
    ? { [config.searchField]: { contains: q, mode: 'insensitive' } }
    : {}

  const model = getModel(modelName)
  const [rows, total] = await Promise.all([
    model.findMany({ where, take: PER_PAGE, skip: (page - 1) * PER_PAGE, orderBy: config.orderBy }),
    model.count({ where }),
  ])

  return NextResponse.json({ rows, total, fields: config.listFields, editFields: config.editFields, createFields: config.createFields, label: config.label })
}

// POST /api/admin/database/[model] — create row
export async function POST(req: NextRequest, { params }: { params: { model: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modelName = params.model
  const config = ALLOWED_MODELS[modelName]
  if (!config) return NextResponse.json({ error: 'Model không hợp lệ' }, { status: 400 })
  if (!config.createFields.length) return NextResponse.json({ error: 'Model này không hỗ trợ tạo mới' }, { status: 400 })

  const { data } = await req.json()
  const safeData: any = {}
  for (const key of config.createFields) {
    if (data[key] !== undefined && data[key] !== '') {
      const val = data[key]
      safeData[key] = typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '' ? Number(val) : val
    }
  }

  try {
    const created = await getModel(modelName).create({ data: safeData })
    return NextResponse.json({ row: created })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Lỗi tạo record' }, { status: 500 })
  }
}

// PUT /api/admin/database/[model] — truncate table
export async function PUT(req: NextRequest, { params }: { params: { model: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modelName = params.model
  if (!ALLOWED_MODELS[modelName]) return NextResponse.json({ error: 'Model không hợp lệ' }, { status: 400 })

  const { action } = await req.json()
  if (action !== 'truncate') return NextResponse.json({ error: 'action không hợp lệ' }, { status: 400 })

  try {
    const result = await getModel(modelName).deleteMany({})
    return NextResponse.json({ ok: true, deleted: result.count })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Lỗi truncate' }, { status: 500 })
  }
}

// PATCH /api/admin/database/[model] - update record
export async function PATCH(req: NextRequest, { params }: { params: { model: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modelName = params.model
  const config = ALLOWED_MODELS[modelName]
  if (!config) return NextResponse.json({ error: 'Model không hợp lệ' }, { status: 400 })

  const { id, data } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Chỉ cho phép edit các field được khai báo
  const safeData: any = {}
  for (const key of config.editFields) {
    if (data[key] !== undefined) {
      // Parse number fields
      const val = data[key]
      safeData[key] = val === '' ? null : (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '' ? Number(val) : val)
    }
  }

  const updated = await getModel(modelName).update({ where: { id }, data: safeData })
  return NextResponse.json({ row: updated })
}

// DELETE /api/admin/database/[model]
export async function DELETE(req: NextRequest, { params }: { params: { model: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const modelName = params.model
  if (!ALLOWED_MODELS[modelName]) return NextResponse.json({ error: 'Model không hợp lệ' }, { status: 400 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await getModel(modelName).delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// GET meta - danh sách models
export async function HEAD() {
  return NextResponse.json({ models: Object.entries(ALLOWED_MODELS).map(([k, v]) => ({ key: k, label: v.label })) })
}
