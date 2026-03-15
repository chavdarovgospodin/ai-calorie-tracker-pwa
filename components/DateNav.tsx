'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateNavProps {
  date: string // YYYY-MM-DD
  onChange: (date: string) => void
}

function formatDate(dateStr: string): string {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateStr === todayStr) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'

  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export default function DateNav({ date, onChange }: DateNavProps) {
  const today = new Date().toLocaleDateString('en-CA')
  const isToday = date === today

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="p-2 rounded-xl text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1A24] transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-semibold text-[#F8FAFC] min-w-[100px] text-center">
        {formatDate(date)}
      </span>
      <button
        onClick={() => onChange(addDays(date, 1))}
        disabled={isToday}
        className="p-2 rounded-xl text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1A24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
