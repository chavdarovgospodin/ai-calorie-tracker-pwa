'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { House, BarChart3, Plus, Settings, Utensils, Zap } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()
  const [sheetOpen, setSheetOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  if (pathname === '/onboarding') return null

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0A0A0F]/90 border-t border-[#1E1E2E]">
        <div className="max-w-[430px] mx-auto flex items-center justify-around px-2 h-16">
          <Link href="/" className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${isActive('/') ? 'text-indigo-400' : 'text-[#64748B] hover:text-[#F8FAFC]'}`}>
            <House size={22} />
            <span className="text-[10px] font-medium">{t.home}</span>
          </Link>
          <Link href="/history" className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${isActive('/history') ? 'text-indigo-400' : 'text-[#64748B] hover:text-[#F8FAFC]'}`}>
            <BarChart3 size={22} />
            <span className="text-[10px] font-medium">{t.history}</span>
          </Link>
          <button onClick={() => setSheetOpen(true)} className="flex flex-col items-center gap-1 px-2 py-2">
            <div className="bg-indigo-600 hover:bg-indigo-500 rounded-full p-3 transition-colors shadow-lg shadow-indigo-600/25">
              <Plus size={22} className="text-white" />
            </div>
          </button>
          <Link href="/settings" className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${isActive('/settings') ? 'text-indigo-400' : 'text-[#64748B] hover:text-[#F8FAFC]'}`}>
            <Settings size={22} />
            <span className="text-[10px] font-medium">{t.settings}</span>
          </Link>
        </div>
      </nav>

      {sheetOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto">
            <div className="bg-[#111118] border-t border-[#1E1E2E] rounded-t-2xl px-4 pb-10 pt-3">
              <div className="w-9 h-1 bg-[#2A2A3E] rounded-full mx-auto mb-5" />
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-4">{t.whatToLog}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setSheetOpen(false); router.push('/add') }}
                  className="bg-[#0A0A0F] border border-[#1E1E2E] hover:border-indigo-500/40 rounded-2xl p-5 flex flex-col items-start gap-3 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-indigo-600/15 rounded-xl flex items-center justify-center">
                    <Utensils size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#F8FAFC] text-sm mb-0.5">{t.food}</p>
                    <p className="text-xs text-[#64748B] leading-relaxed">{t.foodSubtitle}</p>
                  </div>
                </button>
                <button
                  onClick={() => { setSheetOpen(false); router.push('/activity') }}
                  className="bg-[#0A0A0F] border border-[#1E1E2E] hover:border-amber-500/40 rounded-2xl p-5 flex flex-col items-start gap-3 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center">
                    <Zap size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#F8FAFC] text-sm mb-0.5">{t.activity}</p>
                    <p className="text-xs text-[#64748B] leading-relaxed">{t.activitySubtitle}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
