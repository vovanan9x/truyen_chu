'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

interface Genre { id: string; name: string; slug: string; _count?: { stories: number } }

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/genres').then(r => r.json()).then(setGenres)
  }, [])

  function slugify(str: string) {
    return str.toLowerCase().replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const res = await fetch('/api/admin/genres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, slug: newSlug }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setGenres(prev => [...prev, data.genre].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName(''); setNewSlug('')
    setLoading(false)
  }

  async function handleEdit(id: string) {
    setLoading(true); setError('')
    const res = await fetch('/api/admin/genres', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: editName, slug: editSlug }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setGenres(prev => prev.map(g => g.id === id ? { ...g, name: editName, slug: editSlug } : g))
    setEditingId(null)
    setLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xoá thể loại "${name}"?`)) return
    const res = await fetch('/api/admin/genres', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setGenres(prev => prev.filter(g => g.id !== id))
  }

  const inputCls = 'px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Quản lý thể loại</h1>

      {/* Add form */}
      <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
        <h2 className="font-semibold text-sm">Thêm thể loại mới</h2>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
          <input value={newName} onChange={e => { setNewName(e.target.value); setNewSlug(slugify(e.target.value)) }}
            placeholder="Tên thể loại" required className={inputCls + ' flex-1 min-w-[140px]'} />
          <input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="slug" required className={inputCls + ' w-40 font-mono'} />
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 shadow-sm">
            <Plus className="w-4 h-4" /> Thêm
          </button>
        </form>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Tên</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Slug</th>
            <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Truyện</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-border/50">
            {genres.map(g => (
              <tr key={g.id} className="hover:bg-muted/20 transition-colors">
                {editingId === g.id ? (
                  <>
                    <td className="px-4 py-2.5"><input value={editName} onChange={e => setEditName(e.target.value)} className={inputCls + ' w-full'} /></td>
                    <td className="px-4 py-2.5"><input value={editSlug} onChange={e => setEditSlug(e.target.value)} className={inputCls + ' w-full font-mono'} /></td>
                    <td />
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleEdit(g.id)} disabled={loading} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-5 py-3.5 font-medium">{g.name}</td>
                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">{g.slug}</td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground">{g._count?.stories ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditingId(g.id); setEditName(g.name); setEditSlug(g.slug) }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(g.id, g.name)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
