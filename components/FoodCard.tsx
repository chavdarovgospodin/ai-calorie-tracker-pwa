'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { FoodEntry } from '@/lib/types'

interface FoodCardProps {
  entry: FoodEntry
  onDelete: (id: string) => void
  onEdit: (id: string) => void
}

export default function FoodCard({ entry, onDelete, onEdit }: FoodCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#F8FAFC] truncate">{entry.name}</p>
        {entry.quantity && (
          <p className="text-sm text-[#64748B] mt-0.5">{entry.quantity}</p>
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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1A24] transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-[#1A1A24] border border-[#1E1E2E] rounded-xl shadow-xl z-10 overflow-hidden">
              <button
                onClick={() => { setMenuOpen(false); onEdit(entry.id) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#F8FAFC] hover:bg-[#2A2A3E] transition-colors"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(entry.id) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
