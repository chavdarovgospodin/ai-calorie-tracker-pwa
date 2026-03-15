'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, History, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProfileSheetProps {
  open: boolean
  onClose: () => void
  email: string
  avatarLetter: string
}

export default function ProfileSheet({ open, onClose, email, avatarLetter }: ProfileSheetProps) {
  const router = useRouter()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
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
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto">
        <div className="bg-[#111118] border border-[#1E1E2E] rounded-t-3xl p-6">
          {/* Handle */}
          <div className="w-10 h-1 bg-[#2A2A3E] rounded-full mx-auto mb-6" />

          {/* Avatar + Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#F8FAFC] text-base truncate">
                {email.split('@')[0]}
              </p>
              <p className="text-sm text-[#64748B] truncate">{email}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-1 mb-4">
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#1A1A24] transition-colors text-left"
            >
              <Settings size={18} className="text-[#64748B]" />
              <span className="text-[#F8FAFC] font-medium">Settings</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#1A1A24] transition-colors text-left"
            >
              <History size={18} className="text-[#64748B]" />
              <span className="text-[#F8FAFC] font-medium">History</span>
            </button>
          </div>

          <div className="border-t border-[#1E1E2E] pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
            >
              <LogOut size={18} className="text-red-400" />
              <span className="text-red-400 font-medium">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
