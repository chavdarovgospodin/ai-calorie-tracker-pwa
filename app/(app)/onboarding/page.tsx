'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import OnboardingSteps from '@/components/OnboardingSteps'
import { createClient } from '@/lib/supabase/client'
import { calculateFromProfile } from '@/lib/calculations'
import type { UserProfile } from '@/lib/types'
import { useLocale } from '@/lib/locale-context'

type OnboardingData = Pick<UserProfile, 'age' | 'weight' | 'height' | 'gender' | 'activity_level' | 'goal'>

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useLocale()

  async function handleComplete(data: OnboardingData) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error(t.notAuthenticated)
      router.push('/login')
      return
    }

    const daily_calorie_target = calculateFromProfile(data)

    const { error } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        ...data,
        daily_calorie_target,
        onboarding_completed: true,
      },
      { onConflict: 'user_id' },
    )

    if (error) {
      toast.error(t.failedToSaveProfile + ': ' + error.message)
    } else {
      toast.success(t.profileSaved)
      router.push('/')
      router.refresh()
    }
  }

  return <OnboardingSteps onComplete={handleComplete} />
}
