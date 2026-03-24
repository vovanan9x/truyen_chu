'use client'

import { useState, useEffect, useCallback } from 'react'
import { Edit2, Trash2, RefreshCw, Search, ChevronLeft, ChevronRight, Save, X, AlertTriangle, Plus, Eraser } from 'lucide-react'

const MODELS = [
  { key: 'user', label: '👤 Người dùng' },
  { key: 'story', label: '📚 Truyện' },
  { key: 'chapter', label: '📄 Chương' },
  { key: 'comment', label: '💬 Bình luận' },
  { key: 'genre', label: '🏷️ Thể loại' },
  { key: 'bannedWord', label: '🚫 Từ cấm' },
  { key: 'crawlSchedule', label: '🕷️ Lịch crawl' },
  { key: 'notification', label: '🔔 Thông báo' },
  { key: 'transaction', label: '💰 Giao dịch' },
  { key: 'errorLog', label: '🐛 Lỗi hệ thống' },
]

function formatValue(val: any): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? '✅' : '❌'
  if (typeof val === 'string' && val.length > 60) return val.slice(0, 60) + '...'
  if (typeof val === 'string' && (val.includes('T') && val.includes('Z'))) {
    try { return new Date(val).toLocaleString('vi-VN') } catch { return val }
  }
  return String(val)
}

function EditModal({ row, editFields, modelKey, onSave, onClose }: any) {
  const [form, setForm] = useState<any>(() => {
    const d: any = {}
    editFields.forEach((f: string) => { d[f] = row[f] ?? '' })
    return d
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setLoading(true); setError('')
    const res = await fetch(`/api/admin/database/${modelKey}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, data: form })
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error); setLoading(false); return }
    onSave(d.row); setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Chỉnh sửa record</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5"/></button>
        </div>
        <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">id: {row.id}</p>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {editFields.map((field: string) => (
            <div key={field}>
              <label className="text-xs font-semibold text-muted-foreground uppercase">{field}</label>
              {typeof form[field] === 'boolean' || form[field] === true || form[field] === false ? (
                <select value={String(form[field])} onChange={e => setForm((p: any) => ({ ...p, [field]: e.target.value === 'true' }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-background text-sm">
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input value={form[field] ?? ''} onChange={e => setForm((p: any) => ({ ...p, [field]: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
          <button onClick={save} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold disabled:opacity-50">
            <Save className="w-3.5 h-3.5"/>{loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddRowModal({ createFields, modelKey, onSave, onClose }: any) {
  const [form, setForm] = useState<any>(() => {
    const d: any = {}
    createFields.forEach((f: string) => { d[f] = '' })
    return d
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setLoading(true); setError('')
    const res = await fetch(`/api/admin/database/${modelKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: form })
    })
    const d = await res.json()
    if (!res.ok) { setError(d.error); setLoading(false); return }
    onSave(d.row); setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-primary"/>Thêm record mới</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5"/></button>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {createFields.map((field: string) => (
            <div key={field}>
              <label className="text-xs font-semibold text-muted-foreground uppercase">{field}</label>
              <input value={form[field] ?? ''} onChange={e => setForm((p: any) => ({ ...p, [field]: e.target.value }))}
                placeholder={field}
                className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
          <button onClick={save} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold disabled:opacity-50">
            <Plus className="w-3.5 h-3.5"/>{loading ? 'Đang tạo...' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DatabaseBrowser() {
  const [model, setModel] = useState('user')
  const [rows, setRows] = useState<any[]>([])
  const [fields, setFields] = useState<string[]>([])
  const [editFields, setEditFields] = useState<string[]>([])
  const [createFields, setCreateFields] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [editRow, setEditRow] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showAddRow, setShowAddRow] = useState(false)
  const [showTruncate, setShowTruncate] = useState(false)
  const [truncating, setTruncating] = useState(false)
  const PER_PAGE = 20

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), q })
    const res = await fetch(`/api/admin/database/${model}?${params}`)
    if (res.ok) {
      const d = await res.json()
      setRows(d.rows); setFields(d.fields); setEditFields(d.editFields)
      setCreateFields(d.createFields ?? []); setTotal(d.total)
    }
    setLoading(false)
  }, [model, page, q])

  useEffect(() => { setPage(1); setQ('') }, [model])
  useEffect(() => { load() }, [load])

  async function confirmDelete() {
    if (!deleteId) return
    await fetch(`/api/admin/database/${model}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: deleteId })
    })
    setDeleteId(null); load()
  }

  async function confirmTruncate() {
    setTruncating(true)
    await fetch(`/api/admin/database/${model}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'truncate' })
    })
    setTruncating(false); setShowTruncate(false); load()
  }

  const totalPages = Math.ceil(total / PER_PAGE)
  const currentModelLabel = MODELS.find(m => m.key === model)?.label ?? model

  return (
    <div className="space-y-5">
      {/* Model selector */}
      <div className="flex flex-wrap gap-2">
        {MODELS.map(m => (
          <button key={m.key} onClick={() => setModel(m.key)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${model === m.key ? 'gradient-primary text-white shadow-sm' : 'border border-border hover:bg-muted'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>
        <span className="text-sm text-muted-foreground">{total.toLocaleString()} records</span>
        <button onClick={load} className="p-2 rounded-xl border border-border hover:bg-muted">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/>
        </button>
        {createFields.length > 0 && (
          <button onClick={() => setShowAddRow(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4"/>Thêm row
          </button>
        )}
        <button onClick={() => setShowTruncate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold">
          <Eraser className="w-4 h-4"/>Trống bảng
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {fields.map(f => (
                  <th key={f} className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">{f}</th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading && rows.length === 0 ? (
                <tr><td colSpan={fields.length + 1} className="text-center py-12 text-muted-foreground">Đang tải...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={fields.length + 1} className="text-center py-12 text-muted-foreground">Không có dữ liệu</td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  {fields.map(f => (
                    <td key={f} className="px-4 py-3 font-mono text-xs whitespace-nowrap max-w-[200px] truncate" title={String(row[f] ?? '')}>
                      {formatValue(row[f])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      {editFields.length > 0 && (
                        <button onClick={() => setEditRow(row)} className="p-1.5 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Sửa">
                          <Edit2 className="w-3.5 h-3.5"/>
                        </button>
                      )}
                      <button onClick={() => setDeleteId(row.id)} className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-500 transition-colors" title="Xoá">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40">
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <span className="text-sm text-muted-foreground">Trang {page} / {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40">
            <ChevronRight className="w-4 h-4"/>
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editRow && (
        <EditModal row={editRow} editFields={editFields} modelKey={model}
          onSave={(updated: any) => { setRows(prev => prev.map(r => r.id === updated.id ? updated : r)); setEditRow(null) }}
          onClose={() => setEditRow(null)} />
      )}

      {/* Add row modal */}
      {showAddRow && (
        <AddRowModal createFields={createFields} modelKey={model}
          onSave={(created: any) => { setRows(prev => [created, ...prev]); setTotal(t => t + 1); setShowAddRow(false) }}
          onClose={() => setShowAddRow(false)} />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0"/>
              <div>
                <h3 className="font-bold">Xác nhận xoá</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Bạn có chắc muốn xoá record này? Hành động không thể khôi phục.</p>
              </div>
            </div>
            <p className="font-mono text-xs bg-muted px-2 py-1 rounded">{deleteId}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
              <button onClick={confirmDelete} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:opacity-90">Xoá</button>
            </div>
          </div>
        </div>
      )}

      {/* Truncate confirm */}
      {showTruncate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Eraser className="w-8 h-8 text-red-500 flex-shrink-0"/>
              <div>
                <h3 className="font-bold">Trống bảng — {currentModelLabel}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sẽ xoá <strong>toàn bộ {total.toLocaleString()} record</strong> khỏi bảng này. Không thể khôi phục!
                </p>
              </div>
            </div>
            <p className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-xl border border-red-200">
              ⚠️ Nhập <code className="font-mono font-bold">TRUNCATE</code> để xác nhận
            </p>
            <input placeholder="TRUNCATE" id="truncate-confirm"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300"/>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTruncate(false)} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
              <button disabled={truncating} onClick={() => {
                const val = (document.getElementById('truncate-confirm') as HTMLInputElement)?.value
                if (val !== 'TRUNCATE') { alert('Nhập sai từ xác nhận'); return }
                confirmTruncate()
              }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                <Eraser className="w-3.5 h-3.5"/>{truncating ? 'Đang xoá...' : 'Trống bảng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
