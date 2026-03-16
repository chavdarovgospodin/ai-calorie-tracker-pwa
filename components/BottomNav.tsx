'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, BarChart3, Plus, Settings } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  if (pathname === '/onboarding') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0A0A0F]/90 border-t border-[#1E1E2E]">
      <div className="max-w-[430px] mx-auto flex items-center justify-around px-2 h-16">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
            isActive('/') ? 'text-indigo-400' : 'text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          <House size={22} />
          <span className="text-[10px] font-medium">Начало</span>
        </Link>

        <Link
          href="/history"
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
            isActive('/history') ? 'text-indigo-400' : 'text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          <BarChart3 size={22} />
          <span className="text-[10px] font-medium">История</span>
        </Link>

        <Link
          href="/add"
          className="flex flex-col items-center gap-1 px-2 py-2"
        >
          <div className="bg-indigo-600 hover:bg-indigo-500 rounded-full p-3 transition-colors shadow-lg shadow-indigo-600/25">
            <Plus size={22} className="text-white" />
          </div>
        </Link>

        <Link
          href="/settings"
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
            isActive('/settings') ? 'text-indigo-400' : 'text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          <Settings size={22} />
          <span className="text-[10px] font-medium">Настройки</span>
        </Link>
      </div>
    </nav>
  )
}
