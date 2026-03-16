'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Save, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calculateFromProfile } from '@/lib/calculations'
import type { UserProfile } from '@/lib/types'

type ProfileFields = Pick<UserProfile, 'age' | 'weight' | 'height' | 'gender' | 'goal' | 'activity_level'>

export default function SettingsPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [gender, setGender] = useState<UserProfile['gender']>('male')
  const [goal, setGoal] = useState<UserProfile['goal']>('maintain')
  const [activityLevel, setActivityLevel] = useState<UserProfile['activity_level']>('moderately_active')

  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  const { data: profileData } = useQuery<UserProfile | null>({
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

  useEffect(() => {
    if (profileData) {
      setAge(String(profileData.age))
      setWeight(String(profileData.weight))
      setHeight(String(profileData.height))
      setGender(profileData.gender)
      setGoal(profileData.goal)
      setActivityLevel(profileData.activity_level)
    }
  }, [profileData])

  const isLoading = !user || !profileData

  const ageNum = Number(age)
  const weightNum = Number(weight)
  const heightNum = Number(height)
  const caloriePreview =
    age && weight && height &&
    ageNum >= 10 && ageNum <= 120 &&
    weightNum >= 20 && weightNum <= 300 &&
    heightNum >= 100 && heightNum <= 250
      ? calculateFromProfile({
          age: ageNum,
          weight: weightNum,
          height: heightNum,
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
    const ageNum = Number(age)
    const weightNum = Number(weight)
    const heightNum = Number(height)
    if (ageNum < 10 || ageNum > 120) {
      toast.error('Age must be between 10 and 120')
      return
    }
    if (weightNum < 20 || weightNum > 300) {
      toast.error('Weight must be between 20 and 300 kg')
      return
    }
    if (heightNum < 100 || heightNum > 250) {
      toast.error('Height must be between 100 and 250 cm')
      return
    }
    setSaving(true)

    if (!user) return

    const profileFields: ProfileFields = {
      age: ageNum,
      weight: weightNum,
      height: heightNum,
      gender,
      goal,
      activity_level: activityLevel,
    }

    const daily_calorie_target = calculateFromProfile(profileFields)

    const { error } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        ...profileFields,
        daily_calorie_target,
        onboarding_completed: true,
      },
      { onConflict: 'user_id' },
    )

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Settings saved!')
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
    }
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    queryClient.clear()
    router.push('/login')
  }

  const inputClass = "w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
  const selectClass = "w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] outline-none transition-colors appearance-none"

  if (isLoading) {
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
      <div className="mb-6 pt-2">
        <h1 className="text-lg font-bold text-[#F8FAFC]">Settings</h1>
      </div>

      {/* Account info */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 mb-5">
        <p className="text-xs text-[#64748B] mb-1">Account</p>
        <p className="font-medium text-[#F8FAFC]">{user?.email}</p>
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

      {/* Logout */}
      <div className="mt-8 mb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl px-5 py-2.5 font-semibold transition-colors"
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </div>
  )
}
