'use client'

import { useLocale } from '@/lib/locale-context'

interface CalorieRingProps {
  consumed: number
  target: number
  burned?: number
}

export default function CalorieRing({ consumed, target, burned = 0 }: CalorieRingProps) {
  const { t } = useLocale()
  const radius = 90
  const circumference = 2 * Math.PI * radius // ~565.49
  const progress = target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const isOver = consumed > target
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          className="-rotate-90"
        >
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke="#1E1E2E"
            strokeWidth="16"
            fill="none"
          />
          {/* Progress */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke={isOver ? '#EF4444' : 'url(#ringGradient)'}
            strokeWidth="16"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={Math.max(strokeDashoffset, 0)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-[#F8FAFC] tabular-nums">
            {consumed.toLocaleString()}
          </span>
          <span className="text-sm text-[#64748B] mt-0.5">
            / {target.toLocaleString()} {t.kcal}
          </span>
          {isOver && (
            <span className="text-xs text-red-400 font-medium mt-1">{t.overLimit}</span>
          )}
        </div>
      </div>
      {burned > 0 && (
        <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <span className="text-xs font-medium text-amber-400">🔥 +{burned} {t.burned}</span>
        </div>
      )}
    </div>
  )
}
