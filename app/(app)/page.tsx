'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import CalorieRing from '@/components/CalorieRing'
import MacroBar from '@/components/MacroBar'
import FoodCard from '@/components/FoodCard'
import ActivityCard from '@/components/ActivityCard'
import DateNav from '@/components/DateNav'
import type { FoodEntry, ActivityEntry, UserProfile } from '@/lib/types'

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-4"><div className="w-[220px] h-[220px] rounded-full bg-[#111118] animate-pulse mx-auto mt-20" /></div>}>
      <Dashboard />
    </Suspense>
  )
}

function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(searchParams.get('date') ?? today)
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUserEmail(user.email ?? '')

    const [profileRes, foodRes, activityRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('food_entries').select('*').eq('user_id', user.id).eq('date', date).order('created_at', { ascending: true }),
      supabase.from('activity_entries').select('*').eq('user_id', user.id).eq('date', date).order('created_at', { ascending: true }),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    if (foodRes.data) setFoodEntries(foodRes.data)
    if (activityRes.data) setActivityEntries(activityRes.data)
    setLoading(false)
  }, [date, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleDeleteFood(id: string) {
    const { error } = await supabase.from('food_entries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete entry')
    } else {
      setFoodEntries((prev) => prev.filter((e) => e.id !== id))
      toast.success('Entry deleted')
    }
  }

  async function handleDeleteActivity(id: string) {
    const { error } = await supabase.from('activity_entries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete activity')
    } else {
      setActivityEntries((prev) => prev.filter((e) => e.id !== id))
      toast.success('Activity deleted')
    }
  }

  const totalCalories = foodEntries.reduce((sum, e) => sum + e.calories, 0)
  const totalProtein = foodEntries.reduce((sum, e) => sum + (e.protein ?? 0), 0)
  const totalCarbs = foodEntries.reduce((sum, e) => sum + (e.carbs ?? 0), 0)
  const totalFat = foodEntries.reduce((sum, e) => sum + (e.fat ?? 0), 0)
  const totalBurned = activityEntries.reduce((sum, e) => sum + e.calories_burned, 0)

  const baseTarget = profile?.daily_calorie_target ?? 2000
  const target = baseTarget + totalBurned
  // Macro targets (rough % of calories)
  const proteinTarget = Math.round((target * 0.25) / 4)
  const carbsTarget = Math.round((target * 0.45) / 4)
  const fatTarget = Math.round((target * 0.30) / 9)

  const avatarLetter = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <div className="p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <DateNav date={date} onChange={setDate} />
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
          {avatarLetter}
        </div>
      </div>

      {/* Calorie Ring */}
      <div className="flex justify-center mb-6">
        {loading ? (
          <div className="w-[220px] h-[220px] rounded-full bg-[#111118] animate-pulse" />
        ) : (
          <CalorieRing consumed={totalCalories} target={target} burned={totalBurned} />
        )}
      </div>

      {/* Macro Bars */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MacroBar label="Protein" current={totalProtein} target={proteinTarget} color="bg-indigo-500" />
        <MacroBar label="Carbs" current={totalCarbs} target={carbsTarget} color="bg-emerald-500" />
        <MacroBar label="Fat" current={totalFat} target={fatTarget} color="bg-amber-500" />
      </div>

      {/* Food Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#F8FAFC]">Today&apos;s Food</h2>
          <button
            onClick={() => router.push('/add')}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-[#111118] animate-pulse" />
            ))}
          </div>
        ) : foodEntries.length === 0 ? (
          <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 text-center">
            <p className="text-[#64748B] text-sm">No food logged yet</p>
            <button
              onClick={() => router.push('/add')}
              className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              + Add your first meal
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {foodEntries.map((entry) => (
              <FoodCard
                key={entry.id}
                entry={entry}
                onDelete={handleDeleteFood}
                onEdit={(id) => router.push(`/add/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Activity Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#F8FAFC]">Activity</h2>
          <button
            onClick={() => router.push('/activity')}
            className="flex items-center gap-1.5 bg-[#1A1A24] hover:bg-[#2A2A3E] border border-[#1E1E2E] text-[#F8FAFC] rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            <Zap size={14} />
            Log
          </button>
        </div>
        {loading ? (
          <div className="h-16 rounded-2xl bg-[#111118] animate-pulse" />
        ) : activityEntries.length === 0 ? (
          <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 text-center">
            <p className="text-[#64748B] text-sm">No activity logged</p>
            <button
              onClick={() => router.push('/activity')}
              className="mt-3 text-amber-400 hover:text-amber-300 text-sm font-medium"
            >
              + Log workout
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activityEntries.map((entry) => (
              <ActivityCard
                key={entry.id}
                entry={entry}
                onDelete={handleDeleteActivity}
                onEdit={(id) => router.push(`/activity/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
