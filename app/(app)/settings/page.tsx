'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Save } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { calculateFromProfile } from '@/lib/calculations'
import type { UserProfile } from '@/lib/types'

type ProfileFields = Pick<UserProfile, 'age' | 'weight' | 'height' | 'gender' | 'goal' | 'activity_level'>

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')

  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [gender, setGender] = useState<UserProfile['gender']>('male')
  const [goal, setGoal] = useState<UserProfile['goal']>('maintain')
  const [activityLevel, setActivityLevel] = useState<UserProfile['activity_level']>('moderately_active')

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        setAge(String(profile.age))
        setWeight(String(profile.weight))
        setHeight(String(profile.height))
        setGender(profile.gender)
        setGoal(profile.goal)
        setActivityLevel(profile.activity_level)
      }
      setLoading(false)
    }
    loadProfile()
  }, [router, supabase])

  const caloriePreview = age && weight && height
    ? calculateFromProfile({
        age: Number(age),
        weight: Number(weight),
        height: Number(height),
        gender,
        goal,
        activity_level: activityLevel,
      } as ProfileFields)
    : null

  async function handleSave() {
    if (!age || !weight || !height) {
      toast.error('Please fill in all fields')
      return
    }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const profileData: ProfileFields = {
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      gender,
      goal,
      activity_level: activityLevel,
    }

    const daily_calorie_target = calculateFromProfile(profileData)

    const { error } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      ...profileData,
      daily_calorie_target,
      onboarding_completed: true,
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Profile updated!')
    }
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const inputClass = "w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
  const selectClass = "w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] outline-none transition-colors appearance-none"

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-[#111118] rounded-xl animate-pulse mb-6 w-36" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-[#111118] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-lg font-bold text-[#F8FAFC]">Settings</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl px-3 py-1.5 transition-colors"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>

      {/* Account info */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 mb-5">
        <p className="text-xs text-[#64748B] mb-1">Account</p>
        <p className="font-medium text-[#F8FAFC]">{email}</p>
      </div>

      {/* Profile fields */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">Profile</h2>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Age</label>
            <input
              type="number" value={age}
              onChange={(e) => setAge(e.target.value)}
              className={inputClass} placeholder="25" min={10} max={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Weight (kg)</label>
            <input
              type="number" value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputClass} placeholder="70" min={30} step={0.1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Height (cm)</label>
            <input
              type="number" value={height}
              onChange={(e) => setHeight(e.target.value)}
              className={inputClass} placeholder="175" min={100} step={0.1}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Biological Sex</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as UserProfile['gender'])} className={selectClass}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Goal</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value as UserProfile['goal'])} className={selectClass}>
            <option value="lose">Lose Weight</option>
            <option value="maintain">Maintain Weight</option>
            <option value="gain">Gain Muscle</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Activity Level</label>
          <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as UserProfile['activity_level'])} className={selectClass}>
            <option value="sedentary">Sedentary</option>
            <option value="lightly_active">Lightly Active</option>
            <option value="moderately_active">Moderately Active</option>
            <option value="very_active">Very Active</option>
            <option value="extremely_active">Extremely Active</option>
          </select>
        </div>

        {/* Live calorie preview */}
        {caloriePreview && (
          <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/30">
            <p className="text-xs text-[#64748B]">Calculated daily target</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{caloriePreview.toLocaleString()} kcal</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Changes
        </button>
      </div>
    </div>
  )
}
