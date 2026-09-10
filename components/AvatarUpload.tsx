'use client'

import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/locale-context'

interface AvatarUploadProps {
  userId: string
  avatarUrl: string | null
  email: string
}

const MAX_BYTES = 5 * 1024 * 1024

async function resizeToBlob(file: File, maxPx = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = reject
    img.src = url
  })
}

export default function AvatarUpload({ userId, avatarUrl, email }: AvatarUploadProps) {
  const { t } = useLocale()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const letter = email ? email[0].toUpperCase() : '?'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast.error(t.photoTooLarge)
      return
    }
    setBusy(true)
    try {
      const blob = await resizeToBlob(file)
      const path = `${userId}/avatar.jpg`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust so the <img> refreshes after re-upload.
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`

      const { error: dbErr } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId)
      if (dbErr) throw dbErr

      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      toast.success(t.photoUpdated)
    } catch {
      toast.error(t.failedToUploadPhoto)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (busy) return
    setBusy(true)
    try {
      await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`])
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      toast.success(t.photoRemoved)
    } catch {
      toast.error(t.failedToUpdate)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-white">{letter}</span>
          )}
        </div>
        {busy && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
        >
          <Camera size={15} />
          {avatarUrl ? t.changePhoto : t.uploadPhoto}
        </button>
        {avatarUrl && (
          <button
            onClick={handleRemove}
            disabled={busy}
            className="flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 size={15} />
            {t.removePhoto}
          </button>
        )}
      </div>
    </div>
  )
}
