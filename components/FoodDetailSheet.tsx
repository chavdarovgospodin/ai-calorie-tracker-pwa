'use client'

import { useState } from 'react'
import { Star, CheckCircle, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { FoodEntry } from '@/lib/types'
import { useLocale } from '@/lib/locale-context'

interface FoodDetailSheetProps {
  entry: FoodEntry | null
  date: string
  userId: string
  onClose: () => void
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const { t } = useLocale()
  if (confidence >= 0.8)
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
        <CheckCircle size={10} /> {t.highConfidence}
      </span>
    )
  if (confidence >= 0.6)
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
        <AlertCircle size={10} /> {t.mediumConfidence}
      </span>
    )
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
      <AlertCircle size={10} /> {t.lowConfidence}
    </span>
  )
}

export default function FoodDetailSheet({ entry, date, userId, onClose }: FoodDetailSheetProps) {
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
      .from('favorite_foods')
      .select('id, use_count')
      .eq('user_id', userId)
      .ilike('name', entry!.name)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('favorite_foods')
        .update({ calories: entry!.calories, protein: entry!.protein, carbs: entry!.carbs, fat: entry!.fat, fiber: entry!.fiber, use_count: existing.use_count + 1 })
        .eq('id', existing.id)
      toast.success(t.favoriteUpdated)
    } else {
      await supabase.from('favorite_foods').insert({
        user_id: userId,
        name: entry!.name,
        calories: entry!.calories,
        protein: entry!.protein,
        carbs: entry!.carbs,
        fat: entry!.fat,
        fiber: entry!.fiber,
        use_count: 1,
      })
      toast.success(t.addedToFavorites)
    }
    queryClient.invalidateQueries({ queryKey: ['favorite_foods', userId] })
    setSaving(false)
  }

  async function handleLogAgain() {
    if (saving) return
    setSaving(true)
    const { error } = await supabase.from('food_entries').insert({
      user_id: userId,
      date,
      name: entry!.name,
      calories: entry!.calories,
      protein: entry!.protein,
      carbs: entry!.carbs,
      fat: entry!.fat,
      fiber: entry!.fiber,
      quantity: entry!.quantity,
      notes: entry!.notes,
      ai_confidence: entry!.ai_confidence,
    })
    if (error) {
      toast.error(t.failedToSave)
      setSaving(false)
    } else {
      queryClient.invalidateQueries({ queryKey: ['food_entries', date] })
      toast.success(t.foodLogged)
      onClose()
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto bg-[#111118] border-t border-[#1E1E2E] rounded-t-2xl px-4 pb-8">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 bg-[#2A2A3E] rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#64748B] hover:text-[#F8FAFC] transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 pr-6">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="font-bold text-[#F8FAFC] text-lg leading-tight mb-1.5 truncate">{entry.name}</h3>
            {entry.ai_confidence !== null && (
              <ConfidenceBadge confidence={entry.ai_confidence} />
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold text-[#F8FAFC] leading-none">{entry.calories}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{t.kcal}</p>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-[#0A0A0F] rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-[#64748B] mb-1">{t.protein}</p>
            <p className="text-base font-bold text-indigo-400">{entry.protein ?? 0}г</p>
          </div>
          <div className="bg-[#0A0A0F] rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-[#64748B] mb-1">{t.carbs}</p>
            <p className="text-base font-bold text-emerald-400">{entry.carbs ?? 0}г</p>
          </div>
          <div className="bg-[#0A0A0F] rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-[#64748B] mb-1">{t.fat}</p>
            <p className="text-base font-bold text-amber-400">{entry.fat ?? 0}г</p>
          </div>
          <div className="bg-[#0A0A0F] rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-[#64748B] mb-1">{t.fiber}</p>
            <p className="text-base font-bold text-[#94a3b8]">{entry.fiber ?? 0}г</p>
          </div>
        </div>

        {/* Extra info */}
        <div className="bg-[#0A0A0F] rounded-xl px-3 py-1 mb-4 divide-y divide-[#1E1E2E]">
          {entry.quantity && (
            <div className="flex justify-between py-2.5">
              <span className="text-sm text-[#64748B]">{t.quantity}</span>
              <span className="text-sm text-[#F8FAFC]">{entry.quantity}</span>
            </div>
          )}
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
