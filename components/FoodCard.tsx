'use client'

import { useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import type { FoodEntry } from '@/lib/types'
import { useLocale } from '@/lib/locale-context'

interface FoodCardProps {
  entry: FoodEntry
  onDelete: (id: string) => void
}

export default function FoodCard({ entry, onDelete }: FoodCardProps) {
  const { t } = useLocale()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmRef.current) {
      confirmRef.current = true
      setConfirmDelete(true)
      timerRef.current = setTimeout(() => {
        confirmRef.current = false
        setConfirmDelete(false)
      }, 3000)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    confirmRef.current = false
    setConfirmDelete(false)
    onDelete(entry.id)
  }

  return (
    <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#F8FAFC] truncate">{entry.name}</p>
        {entry.quantity && (
          <p className="text-sm text-[#64748B] mt-0.5">{entry.quantity}</p>
        )}
        {entry.notes && (
          <p className="text-xs text-[#64748B] mt-0.5">{entry.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {entry.protein !== null && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-600/15 text-indigo-400">
              P {Math.round(entry.protein)}g
            </span>
          )}
          {entry.carbs !== null && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-600/15 text-emerald-400">
              C {Math.round(entry.carbs)}g
            </span>
          )}
          {entry.fat !== null && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-amber-600/15 text-amber-400">
              F {Math.round(entry.fat)}g
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xl font-bold tabular-nums text-[#F8FAFC]">{entry.calories}</span>
        <button
          onClick={handleDelete}
          title={confirmDelete ? 'Click again to confirm delete' : undefined}
          className={`flex-shrink-0 transition-all duration-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold ${
            confirmDelete
              ? 'bg-red-500 text-white animate-pulse'
              : 'text-[#64748B] hover:text-red-400 hover:bg-red-500/10'
          }`}
        >
          {confirmDelete ? t.confirm : <Trash2 size={15} />}
        </button>
      </div>
    </div>
  )
}
