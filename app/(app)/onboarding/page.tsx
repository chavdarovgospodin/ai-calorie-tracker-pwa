'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import OnboardingSteps from '@/components/OnboardingSteps'
import { createClient } from '@/lib/supabase/client'
import { calculateFromProfile } from '@/lib/calculations'
import type { UserProfile } from '@/lib/types'

type OnboardingData = Pick<UserProfile, 'age' | 'weight' | 'height' | 'gender' | 'activity_level' | 'goal'>

export default function OnboardingPage() {
  const router = useRouter()

  async function handleComplete(data: OnboardingData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Не си влязъл в акаунта')
      router.push('/login')
      return
    }

    const daily_calorie_target = calculateFromProfile(data)

    const { error } = await supabase.from('user_profiles').upsert({
      user_id: user.id,
      ...data,
      daily_calorie_target,
      onboarding_completed: true,
    })

    if (error) {
      toast.error('Грешка при запазване на профила: ' + error.message)
    } else {
      toast.success('Профилът е запазен! Добре дошъл в Calio 🎉')
      router.push('/')
      router.refresh()
    }
  }

  return <OnboardingSteps onComplete={handleComplete} />
}
