'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, TrendingUp, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types'

interface DayData {
  date: string
  calories: number
  burned: number
}

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatDayLabel(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function HistoryPage() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState<DayData[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { start, end } = getMonthRange(year, month)

    const [profileRes, foodRes, activityRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('food_entries').select('date, calories').eq('user_id', user.id).gte('date', start).lte('date', end),
      supabase.from('activity_entries').select('date, calories_burned').eq('user_id', user.id).gte('date', start).lte('date', end),
    ])

    if (profileRes.data) setProfile(profileRes.data)

    // Group by date
    const dayMap: Record<string, DayData> = {}

    for (const entry of foodRes.data ?? []) {
      if (!dayMap[entry.date]) dayMap[entry.date] = { date: entry.date, calories: 0, burned: 0 }
      dayMap[entry.date].calories += entry.calories
    }

    for (const entry of activityRes.data ?? []) {
      if (!dayMap[entry.date]) dayMap[entry.date] = { date: entry.date, calories: 0, burned: 0 }
      dayMap[entry.date].burned += entry.calories_burned
    }

    setDays(Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date)))
    setLoading(false)
  }, [year, month, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    const current = new Date()
    if (year === current.getFullYear() && month === current.getMonth() + 1) return
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const target = profile?.daily_calorie_target ?? 2000
  const trackedDays = days.length
  const avgCalories = trackedDays > 0 ? Math.round(days.reduce((s, d) => s + d.calories, 0) / trackedDays) : 0

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <h1 className="text-lg font-bold text-[#F8FAFC] flex-1">History</h1>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1A24] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-[#F8FAFC]">{formatMonthLabel(year, month)}</span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-2 rounded-xl text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1A24] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary card */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-indigo-400" />
              <span className="text-xs text-[#64748B]">Avg. Calories</span>
            </div>
            <p className="text-2xl font-bold text-[#F8FAFC]">{loading ? '–' : avgCalories.toLocaleString()}</p>
            <p className="text-xs text-[#64748B]">target {target.toLocaleString()} kcal</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} className="text-indigo-400" />
              <span className="text-xs text-[#64748B]">Days Tracked</span>
            </div>
            <p className="text-2xl font-bold text-[#F8FAFC]">{loading ? '–' : trackedDays}</p>
            <p className="text-xs text-[#64748B]">this month</p>
          </div>
        </div>
      </div>

      {/* Day list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-[#111118] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-8 text-center">
          <Calendar size={28} className="text-[#64748B] mx-auto mb-3" />
          <p className="text-[#64748B] text-sm">No data tracked this month</p>
        </div>
      ) : (
        <div className="space-y-2">
          {days.map((day) => {
            const dayTarget = (profile?.daily_calorie_target ?? 2000) + day.burned
            const diff = day.calories - dayTarget
            const isOver = diff > 0
            const pct = dayTarget > 0 ? Math.round((day.calories / dayTarget) * 100) : 0

            return (
              <button
                key={day.date}
                onClick={() => router.push(`/?date=${day.date}`)}
                className="w-full bg-[#111118] border border-[#1E1E2E] hover:border-[#2A2A3E] rounded-2xl p-4 flex items-center justify-between transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-[#F8FAFC] text-sm">{formatDayLabel(day.date)}</p>
                  {day.burned > 0 && (
                    <p className="text-xs text-amber-400 mt-0.5">🔥 {day.burned} burned</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#F8FAFC] tabular-nums">{day.calories.toLocaleString()} kcal</p>
                  <p className={`text-xs font-medium ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isOver ? '+' : ''}{diff} ({pct}%)
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
