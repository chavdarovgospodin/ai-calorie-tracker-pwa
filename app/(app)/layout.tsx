import BottomNav from '@/components/BottomNav'
import { LocaleProvider } from '@/lib/locale-context'

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
