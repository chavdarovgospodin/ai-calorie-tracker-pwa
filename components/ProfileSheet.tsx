'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, History, LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
  email: string
  avatarLetter: string
}

export default function ProfileSheet({ open, onClose, email, avatarLetter }: ProfileSheetProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    queryClient.clear()
    onClose()
    router.push('/login')
  }

  function navigate(path: string) {
    onClose()
    router.push(path)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        ref={containerRef}
        className="fixed top-14 right-4 z-50 w-64 bg-[#111118] border border-[#1E1E2E] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* Avatar + Info */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1E1E2E]">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-base font-bold text-white flex-shrink-0">
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#F8FAFC] text-sm truncate">
              {email.split('@')[0]}
            </p>
            <p className="text-xs text-[#64748B] truncate">{email}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="py-1">
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1A1A24] transition-colors text-left"
          >
            <Settings size={16} className="text-[#64748B]" />
            <span className="text-[#F8FAFC] text-sm font-medium">Settings</span>
          </button>
          <button
            onClick={() => navigate('/history')}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1A1A24] transition-colors text-left"
          >
            <History size={16} className="text-[#64748B]" />
            <span className="text-[#F8FAFC] text-sm font-medium">History</span>
          </button>
        </div>

        <div className="border-t border-[#1E1E2E] py-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors text-left"
          >
            <LogOut size={16} className="text-red-400" />
            <span className="text-red-400 text-sm font-medium">Log out</span>
          </button>
        </div>
      </div>
    </>
  )
}
