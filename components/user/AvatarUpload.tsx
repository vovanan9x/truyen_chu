'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Props {
  currentAvatar?: string | null
  userName?: string | null
  onSuccess?: (url: string) => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024

export default function AvatarUpload({ currentAvatar, userName, onSuccess }: Props) {
  const { data: session, update } = useSession()
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentUrl = preview ?? currentAvatar ?? null
  const initial = (userName ?? session?.user?.name ?? '?')[0]?.toUpperCase()

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return `Chỉ hỗ trợ JPG, PNG, GIF, WEBP`
    if (file.size > MAX_SIZE) return 'File tối đa 5 MB'
    return null
  }

  async function upload(file: File) {
    const err = validate(file)
    if (err) { setErrorMsg(err); setStatus('error'); return }

    // Preview ngay
    setPreview(URL.createObjectURL(file))
    setStatus('uploading')
    setErrorMsg('')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || 'Upload thất bại'); setStatus('error'); return }
      setStatus('success')
      onSuccess?.(data.avatarUrl)
      // Cập nhật session để header hiện ảnh mới
      await update({ image: data.avatarUrl })
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      setErrorMsg('Lỗi kết nối')
      setStatus('error')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }, [])

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar preview + click to upload */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative w-24 h-24 rounded-full cursor-pointer group overflow-hidden ring-2 transition-all ${
          dragging ? 'ring-primary ring-offset-2 scale-105' : 'ring-border hover:ring-primary/60'
        }`}>
        {/* Avatar */}
        {currentUrl ? (
          <img src={currentUrl} alt={userName ?? ''} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full gradient-primary flex items-center justify-center text-white text-3xl font-bold">
            {initial}
          </div>
        )}
        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white transition-opacity ${
          dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {status === 'uploading'
            ? <Loader2 className="w-6 h-6 animate-spin"/>
            : <><Camera className="w-5 h-5"/><span className="text-[10px] mt-1">Đổi ảnh</span></>
          }
        </div>
      </div>

      {/* Status messages */}
      {status === 'success' && (
        <p className="flex items-center gap-1 text-xs text-green-600 font-medium">
          <CheckCircle className="w-3.5 h-3.5"/>Cập nhật ảnh thành công!
        </p>
      )}
      {status === 'error' && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5"/>{errorMsg}
        </p>
      )}

      {/* Upload button */}
      <button type="button" onClick={() => inputRef.current?.click()}
        disabled={status === 'uploading'}
        className="text-xs text-primary hover:underline disabled:opacity-50">
        {status === 'uploading' ? 'Đang tải...' : 'Chọn ảnh đại diện'}
      </button>
      <p className="text-[10px] text-muted-foreground">JPG, PNG, GIF, WEBP — tối đa 2 MB</p>

      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,image/*"
        className="hidden" onChange={onFileChange}/>
    </div>
  )
}
