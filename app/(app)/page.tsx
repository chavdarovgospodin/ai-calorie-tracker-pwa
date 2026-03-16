'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { saveLastUser } from '@/lib/lastUser'
import CalorieRing from '@/components/CalorieRing'
import MacroBar from '@/components/MacroBar'
import FoodCard from '@/components/FoodCard'
import ActivityCard from '@/components/ActivityCard'
import DateNav from '@/components/DateNav'
import ProfileSheet from '@/components/ProfileSheet'
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
  const today = new Date().toLocaleDateString('en-CA')
  const [date, setDate] = useState(searchParams.get('date') ?? today)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const param = searchParams.get('date')
    if (param && param !== date) setDate(param)
  }, [searchParams])

  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

  // Save last user from OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cbEmail = params.get('cb_email')
    const cbProvider = params.get('cb_provider')
    if (cbEmail) {
      saveLastUser(cbEmail, (cbProvider as 'google' | 'email') ?? 'google')
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      return data
    },
    enabled: !!user,
  })

  const { data: foodEntries = [], isLoading } = useQuery<FoodEntry[]>({
    queryKey: ['food_entries', date, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', date)
        .order('created_at', { ascending: true })
      return data ?? []
    },
    enabled: !!user,
  })

  const { data: activityEntries = [] } = useQuery<ActivityEntry[]>({
    queryKey: ['activity_entries', date, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('user_id', user!.id)
        .eq('date', date)
        .order('created_at', { ascending: true })
      return data ?? []
    },
    enabled: !!user,
  })

  const { data: earliestDate } = useQuery<string | null>({
    queryKey: ['earliest_date', user?.id],
    queryFn: async () => {
      const [foodRes, activityRes] = await Promise.all([
        supabase.from('food_entries').select('date').eq('user_id', user!.id).order('date', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('activity_entries').select('date').eq('user_id', user!.id).order('date', { ascending: true }).limit(1).maybeSingle(),
      ])
      const dates = [foodRes.data?.date, activityRes.data?.date].filter(Boolean) as string[]
      return dates.length > 0 ? dates.sort()[0] : null
    },
    enabled: !!user,
  })

  async function handleDeleteFood(id: string) {
    const { error } = await supabase.from('food_entries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete entry')
    } else {
      queryClient.invalidateQueries({ queryKey: ['food_entries', date] })
      toast.success('Entry deleted')
    }
  }

  async function handleDeleteActivity(id: string) {
    const { error } = await supabase.from('activity_entries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete activity')
    } else {
      queryClient.invalidateQueries({ queryKey: ['activity_entries', date] })
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
  const proteinTarget = Math.round((target * 0.25) / 4)
  const carbsTarget = Math.round((target * 0.45) / 4)
  const fatTarget = Math.round((target * 0.30) / 9)

  const userEmail = user?.email ?? ''
  const avatarLetter = userEmail ? userEmail[0].toUpperCase() : '?'

  return (
    <>
    <div className="p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <DateNav date={date} onChange={setDate} earliestDate={earliestDate ?? today} />
        <button
          onClick={() => setProfileOpen(true)}
          className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white hover:bg-indigo-500 transition-colors"
        >
          {avatarLetter}
        </button>
      </div>

      {/* Calorie Ring */}
      <div className="flex justify-center mb-6">
        {isLoading ? (
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
            onClick={() => router.push(`/add?date=${date}`)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-[#111118] animate-pulse" />
            ))}
          </div>
        ) : foodEntries.length === 0 ? (
          <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 text-center">
            <p className="text-[#64748B] text-sm">No food logged yet</p>
            <button
              onClick={() => router.push(`/add?date=${date}`)}
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
            onClick={() => router.push(`/activity?date=${date}`)}
            className="flex items-center gap-1.5 bg-[#1A1A24] hover:bg-[#2A2A3E] border border-[#1E1E2E] text-[#F8FAFC] rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
          >
            <Zap size={14} />
            Log
          </button>
        </div>
        {isLoading ? (
          <div className="h-16 rounded-2xl bg-[#111118] animate-pulse" />
        ) : activityEntries.length === 0 ? (
          <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-6 text-center">
            <p className="text-[#64748B] text-sm">No activity logged</p>
            <button
              onClick={() => router.push(`/activity?date=${date}`)}
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
              />
            ))}
          </div>
        )}
      </div>
    </div>

    <ProfileSheet
      open={profileOpen}
      onClose={() => setProfileOpen(false)}
      email={userEmail}
      avatarLetter={avatarLetter}
    />
    </>
  )
}
