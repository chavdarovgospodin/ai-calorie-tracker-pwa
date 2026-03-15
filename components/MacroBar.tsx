'use client'

interface MacroBarProps {
  label: string
  current: number
  target: number
  color: string
}

export default function MacroBar({ label, current, target, color }: MacroBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{label}</span>
      </div>
      <div className="mb-2">
        <span className="text-lg font-bold text-[#F8FAFC] tabular-nums">{Math.round(current)}</span>
        <span className="text-xs text-[#64748B] ml-1">/ {Math.round(target)}g</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1E1E2E]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
