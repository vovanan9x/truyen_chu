'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, Trash2, RotateCcw, HardDrive, Upload, AlertTriangle, X, RefreshCw, Shield } from 'lucide-react'

interface BackupFile {
  name: string
  size: number
  createdAt: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' })
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Restore from list
  const [toRestore, setToRestore] = useState<BackupFile | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState('')
  const [restoring, setRestoring] = useState(false)

  // Upload restore
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadConfirm, setUploadConfirm] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchBackups = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/backup')
    if (res.ok) setBackups((await res.json()).backups)
    setLoading(false)
  }

  useEffect(() => { fetchBackups() }, [])

  const createBackup = async () => {
    setCreating(true)
    const res = await fetch('/api/admin/backup', { method: 'POST' })
    const d = await res.json()
    if (res.ok) {
      showToast(`✅ Tạo backup thành công: ${d.backup.name} (${formatBytes(d.backup.size)})`, true)
      fetchBackups()
    } else {
      showToast(`❌ ${d.error}`, false)
    }
    setCreating(false)
  }

  const deleteBackup = async (name: string) => {
    if (!confirm(`Xóa file backup "${name}"?`)) return
    const res = await fetch(`/api/admin/backup?file=${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (res.ok) { showToast('Đã xóa file backup', true); fetchBackups() }
    else showToast('Lỗi xóa file', false)
  }

  const downloadBackup = (name: string) => {
    window.location.href = `/api/admin/backup/download?file=${encodeURIComponent(name)}`
  }

  // Restore from existing backup file on server
  const handleRestoreFromServer = async () => {
    if (!toRestore || restoreConfirm !== 'RESTORE') return
    setRestoring(true)
    const form = new FormData()
    // Download file first, then restore — OR call a server-side restore by filename
    const res = await fetch(`/api/admin/restore?file=${encodeURIComponent(toRestore.name)}`, { method: 'POST' })
    const d = await res.json()
    if (res.ok) { showToast('✅ Restore hoàn tất! Server nên được restart.', true) }
    else showToast(`❌ ${d.error}`, false)
    setRestoring(false)
    setToRestore(null)
    setRestoreConfirm('')
  }

  // Restore from uploaded file
  const handleUploadRestore = async () => {
    if (!uploadFile || uploadConfirm !== 'RESTORE') return
    setUploading(true)
    const form = new FormData()
    form.append('file', uploadFile)
    form.append('confirm', 'RESTORE')
    const res = await fetch('/api/admin/restore', { method: 'POST', body: form })
    const d = await res.json()
    if (res.ok) {
      showToast('✅ Restore hoàn tất! Khuyến nghị restart server.', true)
      setUploadFile(null); setUploadConfirm('')
    } else {
      showToast(`❌ ${d.error}`, false)
    }
    setUploading(false)
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          toast.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-destructive border-red-200'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HardDrive className="w-6 h-6" /> Backup & Restore</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý bản sao lưu cơ sở dữ liệu PostgreSQL</p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity shadow-sm"
        >
          {creating
            ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Đang tạo...</>
            : <><HardDrive className="w-4 h-4" /> Tạo Backup Mới</>
          }
        </button>
      </div>

      {/* Warning */}
      <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Lưu ý quan trọng</p>
          <p className="mt-0.5 text-amber-700">Restore sẽ <strong>ghi đè toàn bộ</strong> dữ liệu hiện tại về thời điểm backup. Mọi thay đổi sau backup sẽ mất. Cần xác nhận bằng từ khóa <code className="font-mono bg-amber-100 px-1 rounded">RESTORE</code> trước khi thực hiện.</p>
        </div>
      </div>

      {/* Restore confirm dialog */}
      {toRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Xác nhận Restore</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Dữ liệu hiện tại sẽ bị <strong>xóa và ghi đè</strong></p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-sm">
              <p className="font-mono text-xs">{toRestore.name}</p>
              <p className="text-muted-foreground text-xs">{formatBytes(toRestore.size)} • {formatDate(toRestore.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Gõ <span className="font-mono font-bold text-destructive">RESTORE</span> để xác nhận:</label>
              <input value={restoreConfirm} onChange={e => setRestoreConfirm(e.target.value)} className={`${inputCls} mt-1.5`} placeholder="RESTORE" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setToRestore(null); setRestoreConfirm('') }} className="flex-1 px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted">Huỷ</button>
              <button
                onClick={handleRestoreFromServer}
                disabled={restoreConfirm !== 'RESTORE' || restoring}
                className="flex-1 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {restoring ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Restore ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="font-semibold text-sm">Danh sách Backup ({backups.length})</h2>
          <button onClick={fetchBackups} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="Làm mới">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Đang tải...</div>
        ) : backups.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Chưa có backup nào. Nhấn "Tạo Backup Mới" để bắt đầu.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Tên file</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Kích thước</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Ngày tạo</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {backups.map(b => (
                <tr key={b.name} className="hover:bg-muted/20">
                  <td className="px-5 py-3 font-mono text-xs">{b.name}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatBytes(b.size)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground hidden sm:table-cell text-xs">{formatDate(b.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => downloadBackup(b.name)} className="flex items-center gap-1 text-primary hover:underline text-xs font-medium" title="Tải về">
                        <Download className="w-3.5 h-3.5" /> Tải về
                      </button>
                      <button onClick={() => { setToRestore(b); setRestoreConfirm('') }} className="flex items-center gap-1 text-amber-600 hover:underline text-xs font-medium" title="Restore">
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                      <button onClick={() => deleteBackup(b.name)} className="flex items-center gap-1 text-destructive hover:underline text-xs font-medium" title="Xóa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload & Restore */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Restore từ file ngoài</h2>
        </div>
        <p className="text-sm text-muted-foreground">Upload file <code className="font-mono bg-muted px-1 rounded">.sql</code> từ máy tính để restore</p>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          {uploadFile ? (
            <div>
              <p className="font-medium text-sm">{uploadFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Click để chọn file .sql hoặc kéo thả vào đây</p>
          )}
          <input ref={fileRef} type="file" accept=".sql,.sql.gz" className="hidden"
            onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadConfirm('') }} />
        </div>

        {uploadFile && (
          <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 text-destructive text-sm font-semibold">
              <Shield className="w-4 h-4" /> Xác nhận restore
            </div>
            <p className="text-xs text-red-700">Dữ liệu hiện tại sẽ bị <strong>xóa và thay thế</strong>. Không thể hoàn tác.</p>
            <div>
              <label className="text-xs font-medium text-red-800">Gõ <span className="font-mono font-bold">RESTORE</span> để xác nhận:</label>
              <input value={uploadConfirm} onChange={e => setUploadConfirm(e.target.value)} className={`${inputCls} mt-1 border-red-300`} placeholder="RESTORE" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setUploadFile(null); setUploadConfirm('') }} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">Huỷ</button>
              <button
                onClick={handleUploadRestore}
                disabled={uploadConfirm !== 'RESTORE' || uploading}
                className="flex-1 px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {uploading ? <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Restore từ file này
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
