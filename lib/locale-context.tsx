'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { translations, type Locale } from '@/lib/i18n'

interface LocaleContextType {
  locale: Locale
  t: typeof translations[Locale]
  setLocale: (locale: Locale) => Promise<void>
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  t: translations.en,
  setLocale: async () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const supabase = createClient()

  useEffect(() => {
    async function loadLocale() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('locale')
        .eq('user_id', user.id)
        .single()

      if (profile?.locale && (profile.locale === 'en' || profile.locale === 'bg')) {
        setLocaleState(profile.locale as Locale)
      }
    }
    loadLocale()
  }, [])

  async function setLocale(newLocale: Locale) {
    setLocaleState(newLocale)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_profiles')
      .update({ locale: newLocale })
      .eq('user_id', user.id)
  }

  return (
    <LocaleContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
