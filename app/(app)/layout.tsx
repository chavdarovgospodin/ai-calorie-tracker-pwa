'use client'

import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import { LocaleProvider } from '@/lib/locale-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['user'],
      staleTime: Infinity,
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        return user
      },
    }).then(() => {
      const user = queryClient.getQueryData<{ id: string }>(['user'])
      if (user?.id) {
        queryClient.prefetchQuery({
          queryKey: ['profile', user.id],
          staleTime: Infinity,
          queryFn: async () => {
            const { data } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', user.id)
              .single()
            return data
          },
        })
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LocaleProvider>
      <div className="min-h-screen bg-[#0A0A0F]">
        <main className="max-w-[430px] mx-auto pb-24 min-h-screen">
          {children}
        </main>
        <BottomNav />
      </div>
    </LocaleProvider>
  )
}
