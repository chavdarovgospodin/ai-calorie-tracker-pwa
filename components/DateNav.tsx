'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateNavProps {
  date: string // YYYY-MM-DD
  onChange: (date: string) => void
  earliestDate?: string // earliest date with tracked data
}

function formatDate(dateStr: string): string {
  const today = new Date().toLocaleDateString('en-CA')
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toLocaleDateString('en-CA')

  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'

  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('en-CA')
}

export default function DateNav({ date, onChange, earliestDate }: DateNavProps) {
  const today = new Date().toLocaleDateString('en-CA')

  const minDate = earliestDate ?? today

  const isToday = date === today
  const isMinDate = date <= minDate

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addDays(date, -1))}
        disabled={isMinDate}
        className="p-2 rounded-xl text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1A24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
