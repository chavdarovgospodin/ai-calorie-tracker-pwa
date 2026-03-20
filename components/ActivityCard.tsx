'use client'

import { useState, useRef } from 'react'
import { Trash2, Flame } from 'lucide-react'
import type { ActivityEntry } from '@/lib/types'
import { useLocale } from '@/lib/locale-context'

interface ActivityCardProps {
  entry: ActivityEntry
  onDelete: (id: string) => void
  onPress: (entry: ActivityEntry) => void
}

export default function ActivityCard({ entry, onDelete, onPress }: ActivityCardProps) {
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
    <div onClick={() => onPress(entry)} className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer active:opacity-80 transition-opacity">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#F8FAFC] truncate">{entry.description}</p>
        {entry.notes && (
          <p className="text-sm text-[#64748B] mt-0.5 truncate">{entry.notes}</p>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          <Flame size={12} className="text-amber-400" />
          <span className="text-xs text-amber-400 font-medium">{entry.calories_burned} {t.kcalBurned}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xl font-bold tabular-nums text-amber-400">{entry.calories_burned}</span>
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
