'use client'

import { useState } from 'react'
import { Flame, Star, CheckCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ActivityEntry } from '@/lib/types'
import { useLocale } from '@/lib/locale-context'

interface ActivityDetailSheetProps {
  entry: ActivityEntry | null
  date: string
  userId: string
  onClose: () => void
}

export default function ActivityDetailSheet({ entry, date, userId, onClose }: ActivityDetailSheetProps) {
  const { t } = useLocale()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  if (!entry) return null

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })
  }

  async function handleAddToFavorites() {
    if (saving) return
    setSaving(true)
    const { data: existing } = await supabase
      .from('favorite_activities')
      .select('id, use_count')
      .eq('user_id', userId)
      .ilike('name', entry!.description)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('favorite_activities')
        .update({ calories_burned: entry!.calories_burned, use_count: existing.use_count + 1 })
        .eq('id', existing.id)
      toast.success(t.favoriteUpdated)
    } else {
      await supabase.from('favorite_activities').insert({
        user_id: userId,
        name: entry!.description,
        calories_burned: entry!.calories_burned,
        use_count: 1,
      })
      toast.success(t.addedToFavoritesActivity)
    }
    queryClient.invalidateQueries({ queryKey: ['favorite_activities', userId] })
    setSaving(false)
  }

  async function handleLogAgain() {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('activity_entries').insert({
      user_id: userId,
      date,
      description: entry!.description,
      calories_burned: entry!.calories_burned,
      notes: entry!.notes,
      ai_confidence: entry!.ai_confidence,
    })
    if (error) {
      toast.error(t.failedToSave)
      setSaving(false)
    } else {
      queryClient.invalidateQueries({ queryKey: ['activity_entries', date] })
      toast.success(t.activityLogged)
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-[400px] mx-auto bg-[#111118] border border-[#1E1E2E] rounded-2xl px-4 pb-5 pt-4">
        <button onClick={onClose} className="absolute top-3 right-3 text-[#64748B] hover:text-[#F8FAFC] transition-colors">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 pr-7 pt-1">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="font-bold text-[#F8FAFC] text-lg leading-tight mb-1.5">{entry.description}</h3>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1.5">
              <Flame size={18} className="text-amber-400" />
              <p className="text-3xl font-bold text-amber-400 leading-none">{entry.calories_burned}</p>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">{t.kcalBurned}</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-[#0A0A0F] rounded-xl px-3 py-1 mb-4 divide-y divide-[#1E1E2E]">
          <div className="flex justify-between py-2.5">
            <span className="text-sm text-[#64748B]">{t.addedAt}</span>
            <span className="text-sm text-[#F8FAFC]">{formatTime(entry.created_at)}</span>
          </div>
          {entry.notes && (
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-[#64748B]">{t.notes}</span>
              <span className="text-sm text-[#F8FAFC] text-right max-w-[60%]">{entry.notes}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleAddToFavorites}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A24] hover:bg-[#2A2A3E] border border-[#1E1E2E] text-amber-400 rounded-xl py-3 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> : <Star size={15} />}
            {t.saveToFavorites}
          </button>
          <button
            onClick={handleLogAgain}
            disabled={saving}
            className="flex-[1.4] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={15} />}
            {t.logAgain}
          </button>
        </div>
      </div>
    </>
  )
}
