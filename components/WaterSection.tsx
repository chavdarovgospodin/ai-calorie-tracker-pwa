'use client'

import { useState, useRef } from 'react'
import { Droplets, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { WaterEntry } from '@/lib/types'
import { useLocale } from '@/lib/locale-context'

const QUICK_ADD = [200, 250, 350, 500]

interface WaterSectionProps {
  date: string
  userId: string
  dailyGoal: number
}

export default function WaterSection({ date, userId, dailyGoal }: WaterSectionProps) {
  const { t } = useLocale()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const confirmRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: entries = [] } = useQuery<WaterEntry[]>({
    queryKey: ['water_entries', date, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('water_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: true })
      return data ?? []
    },
    enabled: !!userId,
  })

  const totalMl = entries.reduce((sum, e) => sum + e.amount_ml, 0)
  const pct = Math.min((totalMl / dailyGoal) * 100, 100)
  const isGoalMet = totalMl >= dailyGoal

  async function handleAdd(ml: number) {
    if (ml <= 0 || ml > 5000) {
      toast.error('Invalid amount')
      return
    }
    const { error } = await supabase.from('water_entries').insert({
      user_id: userId,
      date,
      amount_ml: ml,
    })
    if (error) {
      toast.error(t.failedToLogWater)
    } else {
      queryClient.invalidateQueries({ queryKey: ['water_entries', date] })
      toast.success(t.waterLogged)
    }
  }

  async function handleDelete(id: string) {
    if (confirmRef.current !== id) {
      confirmRef.current = id
      setDeletingId(id)
      timerRef.current = setTimeout(() => {
        confirmRef.current = null
        setDeletingId(null)
      }, 3000)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    confirmRef.current = null
    setDeletingId(null)
    const { error } = await supabase.from('water_entries').delete().eq('id', id)
    if (error) {
      toast.error(t.failedToDeleteWater)
    } else {
      queryClient.invalidateQueries({ queryKey: ['water_entries', date] })
      toast.success(t.waterDeleted)
    }
  }

  function formatAmount(ml: number) {
    if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.0', '')}${t.liters}`
    return `${ml}${t.ml}`
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={18} className={isGoalMet ? 'text-cyan-400' : 'text-cyan-500'} />
          <h2 className="text-base font-semibold text-[#F8FAFC]">{t.water}</h2>
        </div>
        <span className="text-sm text-[#64748B]">
          {formatAmount(totalMl)}
          <span className="text-[#3A3A4E]"> / </span>
          {formatAmount(dailyGoal)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[#1E1E2E] mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isGoalMet ? 'bg-cyan-400' : 'bg-cyan-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Quick add buttons */}
      <div className="flex gap-2 mb-3">
        {QUICK_ADD.map((ml) => (
          <button
            key={ml}
            onClick={() => handleAdd(ml)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-cyan-400 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-600/20 transition-colors"
          >
            +{ml}{t.ml}
          </button>
        ))}
      </div>

      {/* Entry list — only if there are entries */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-[#111118] border border-[#1E1E2E] rounded-xl px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Droplets size={13} className="text-cyan-500" />
                <span className="text-sm text-[#F8FAFC]">{formatAmount(entry.amount_ml)}</span>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className={`text-xs font-semibold rounded-lg px-2 py-1 transition-colors ${
                  deletingId === entry.id
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-[#64748B] hover:text-red-400'
                }`}
              >
                {deletingId === entry.id ? t.confirm : <Trash2 size={12} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
