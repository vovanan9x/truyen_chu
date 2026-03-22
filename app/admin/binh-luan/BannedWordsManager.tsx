'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, ToggleRight, ToggleLeft, AlertCircle, Upload } from 'lucide-react'

interface BannedWord {
  id: string
  word: string
  isActive: boolean
  hitCount: number
  createdAt: string
}

export default function BannedWordsManager() {
  const [words, setWords] = useState<BannedWord[]>([])
  const [loading, setLoading] = useState(true)
  const [newWord, setNewWord] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [showBulk, setShowBulk] = useState(false)

  const fetchWords = async () => {
    const res = await fetch('/api/admin/banned-words')
    if (res.ok) { const d = await res.json(); setWords(d.words) }
    setLoading(false)
  }

  useEffect(() => { fetchWords() }, [])

  const addWord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWord.trim()) return
    setAdding(true); setError('')
    const res = await fetch('/api/admin/banned-words', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newWord.trim() })
    })
    if (res.ok) { setNewWord(''); fetchWords() }
    else { const d = await res.json(); setError(d.error) }
    setAdding(false)
  }

  const toggleWord = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/banned-words', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive })
    })
    setWords(prev => prev.map(w => w.id === id ? { ...w, isActive: !isActive } : w))
  }

  const deleteWord = async (id: string) => {
    await fetch(`/api/admin/banned-words?id=${id}`, { method: 'DELETE' })
    setWords(prev => prev.filter(w => w.id !== id))
  }

  const bulkImport = async () => {
    const wordList = bulkText.split(/[\n,]+/).map(w => w.trim()).filter(Boolean)
    if (!wordList.length) return
    const res = await fetch('/api/admin/banned-words', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulkWords: wordList })
    })
    if (res.ok) { setBulkText(''); setShowBulk(false); fetchWords() }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-destructive"/>
          <h2 className="text-lg font-bold">Từ cấm ({words.filter(w => w.isActive).length} đang hoạt động)</h2>
        </div>
        <button onClick={() => setShowBulk(!showBulk)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:bg-muted text-sm">
          <Upload className="w-4 h-4"/>Import nhiều từ
        </button>
      </div>

      {/* Bulk import */}
      {showBulk && (
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <p className="text-sm text-muted-foreground">Nhập mỗi từ trên 1 dòng hoặc cách nhau bằng dấu phẩy:</p>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
            rows={5} placeholder={'chửi thề\ntừ xấu\n...'}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"/>
          <div className="flex gap-3">
            <button onClick={() => setShowBulk(false)} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
            <button onClick={bulkImport} className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90">
              Import {bulkText.split(/[\n,]+/).filter(w=>w.trim()).length} từ
            </button>
          </div>
        </div>
      )}

      {/* Add word form */}
      <form onSubmit={addWord} className="flex gap-3">
        <input value={newWord} onChange={e => setNewWord(e.target.value)}
          placeholder="Nhập từ cần cấm..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"/>
        <button type="submit" disabled={adding || !newWord.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
          <Plus className="w-4 h-4"/>Thêm
        </button>
      </form>
      {error && <p className="text-sm text-destructive flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/>{error}</p>}

      {/* Word list */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Đang tải...</div>
      ) : words.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p>Chưa có từ cấm nào</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
            <span>Từ cấm</span>
            <span className="text-center">Bị trigger</span>
            <span>Trạng thái</span>
            <span></span>
          </div>
          <div className="divide-y divide-border/50">
            {words.map(w => (
              <div key={w.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3">
                <span className={`font-mono text-sm ${!w.isActive ? 'line-through text-muted-foreground' : ''}`}>
                  {w.word}
                </span>
                <span className="text-xs text-center text-muted-foreground">{w.hitCount > 0 && `${w.hitCount}x`}</span>
                <button onClick={() => toggleWord(w.id, w.isActive)}>
                  {w.isActive
                    ? <ToggleRight className="w-5 h-5 text-green-500"/>
                    : <ToggleLeft className="w-5 h-5 text-muted-foreground"/>
                  }
                </button>
                <button onClick={() => deleteWord(w.id)} className="p-1 rounded hover:bg-red-50 text-destructive">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
