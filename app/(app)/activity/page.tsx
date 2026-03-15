'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Sparkles, CheckCircle, AlertCircle, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { ActivityAnalysis } from '@/lib/types'

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
        <CheckCircle size={10} /> High confidence
      </span>
    )
  }
  if (confidence >= 0.6) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
        <AlertCircle size={10} /> Medium confidence
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
      <AlertCircle size={10} /> Low confidence
    </span>
  )
}

export default function AddActivityPage() {
  return (
    <Suspense fallback={<div className="p-4"><div className="h-12 bg-[#111118] rounded-xl animate-pulse" /></div>}>
      <AddActivity />
    </Suspense>
  )
}

function AddActivity() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<ActivityAnalysis | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAnalyze() {
    if (!description.trim()) {
      toast.error('Please describe your workout')
      return
    }

    setAnalyzing(true)
    setResult(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let weightKg = 70

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('weight')
          .eq('user_id', user.id)
          .single()
        if (profile?.weight) weightKg = profile.weight
      }

      const res = await fetch('/api/analyze-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, weightKg }),
      })

      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data)
    } catch {
      toast.error('Failed to analyze activity. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      return
    }

    const { error } = await supabase.from('activity_entries').insert({
      user_id: user.id,
      date,
      description: result.activityName,
      calories_burned: result.caloriesBurned,
      notes: notes || null,
      ai_confidence: result.confidence,
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Activity logged!')
      router.push('/')
    }
    setSaving(false)
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#1A1A24] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-[#F8FAFC]">Log Activity</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Describe your workout</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="e.g. 30 minutes of running at moderate pace, then 20 minutes of weight training"
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it feel?"
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="w-full mt-5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {analyzing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Analyze with AI
          </>
        )}
      </button>

      {/* Loading skeleton */}
      {analyzing && (
        <div className="mt-4 bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 space-y-3">
          <div className="h-5 bg-[#1A1A24] rounded-lg animate-pulse w-2/3" />
          <div className="h-8 bg-[#1A1A24] rounded-lg animate-pulse w-1/3" />
        </div>
      )}

      {/* Result card */}
      {result && !analyzing && (
        <div className="mt-4 bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-[#F8FAFC]">{result.activityName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Flame size={16} className="text-amber-400" />
                <p className="text-2xl font-bold text-amber-400">
                  {result.caloriesBurned}
                  <span className="text-sm font-normal text-[#64748B] ml-1">kcal burned</span>
                </p>
              </div>
              {result.durationMinutes > 0 && (
                <p className="text-sm text-[#64748B] mt-1">{result.durationMinutes} minutes</p>
              )}
            </div>
            <ConfidenceBadge confidence={result.confidence} />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            Save to diary
          </button>
        </div>
      )}
    </div>
  )
}
