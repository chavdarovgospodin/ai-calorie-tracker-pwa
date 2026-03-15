'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Sparkles, CheckCircle, AlertCircle, Flame, Star, Trash2 as TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { ActivityAnalysis, FavoriteActivity } from '@/lib/types'

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

function FavoriteActivityRow({
  fav,
  onLog,
  onDelete,
  isLogging,
}: {
  fav: FavoriteActivity
  onLog: (fav: FavoriteActivity) => void
  onDelete: (id: string) => void
  isLogging: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    onDelete(fav.id)
  }

  return (
    <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl px-3 py-2.5 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F8FAFC] truncate">{fav.description}</p>
        <p className="text-xs text-amber-400">{fav.calories_burned} kcal burned</p>
      </div>
      <button
        onClick={() => onLog(fav)}
        disabled={isLogging}
        className={`text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-600/10 hover:bg-indigo-600/20 px-2.5 py-1 rounded-lg transition-colors${isLogging ? ' opacity-50' : ''}`}
      >
        + Log
      </button>
      <button
        onClick={handleDelete}
        className={`text-xs font-semibold rounded-lg px-2 py-1 transition-colors ${
          confirmDelete
            ? 'bg-red-500 text-white'
            : 'text-[#64748B] hover:text-red-400'
        }`}
      >
        {confirmDelete ? '?' : <TrashIcon size={13} />}
      </button>
    </div>
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
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [phase, setPhase] = useState<'idle' | 'validating' | 'analyzing' | 'done' | 'error'>('idle')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [result, setResult] = useState<ActivityAnalysis | null>(null)
  const [saving, setSaving] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteActivity[]>([])
  const [weightKg, setWeightKg] = useState(70)
  const [loggingFavoriteId, setLoggingFavoriteId] = useState<string | null>(null)

  useEffect(() => {
    async function loadFavorites() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('weight')
        .eq('user_id', user.id)
        .single()
      if (profile?.weight) setWeightKg(profile.weight)

      const { data } = await supabase
        .from('favorite_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('use_count', { ascending: false })
        .limit(10)
      if (data) setFavorites(data)
    }
    loadFavorites()
  }, [])

  async function handleSaveFavorite() {
    if (!result) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase
      .from('favorite_activities')
      .select('id, use_count')
      .eq('user_id', user.id)
      .ilike('description', result.activityName)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('favorite_activities')
        .update({
          calories_burned: result.caloriesBurned,
          use_count: existing.use_count + 1,
        })
        .eq('id', existing.id)

      if (error) {
        toast.error('Failed to update favorite')
      } else {
        setFavorites(prev =>
          prev
            .map(f => f.id === existing.id
              ? { ...f, calories_burned: result!.caloriesBurned, use_count: existing.use_count + 1 }
              : f
            )
            .sort((a, b) => b.use_count - a.use_count)
        )
        toast.success('Favorite updated ⭐')
      }
    } else {
      const { data: newFav, error } = await supabase
        .from('favorite_activities')
        .insert({
          user_id: user.id,
          description: result.activityName,
          calories_burned: result.caloriesBurned,
          use_count: 1,
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to save favorite')
      } else {
        setFavorites(prev =>
          [newFav, ...prev].sort((a, b) => b.use_count - a.use_count)
        )
        toast.success('Added to favorites ⭐')
      }
    }
  }

  async function handleLogFavorite(fav: FavoriteActivity) {
    setLoggingFavoriteId(fav.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoggingFavoriteId(null); return }

    const { error } = await supabase.from('activity_entries').insert({
      user_id: user.id,
      date,
      description: fav.description,
      calories_burned: fav.calories_burned,
      notes: null,
      ai_confidence: null,
    })

    if (error) {
      toast.error('Failed to log activity')
      setLoggingFavoriteId(null)
      return
    }

    await supabase
      .from('favorite_activities')
      .update({ use_count: fav.use_count + 1 })
      .eq('id', fav.id)

    toast.success(`${fav.description} logged!`)
    router.push(`/?date=${date}`)
  }

  async function handleDeleteFavorite(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('favorite_activities').delete().eq('id', id)
    if (error) {
      toast.error('Failed to remove favorite')
    } else {
      setFavorites((prev) => prev.filter((f) => f.id !== id))
    }
  }

  async function handleAnalyze() {
    if (!description.trim()) {
      toast.error('Please describe your workout')
      return
    }

    setPhase('validating')
    setValidationError(null)
    setResult(null)

    try {
      // Step 1: Validate
      const validateRes = await fetch('/api/validate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: description }),
      })
      if (!validateRes.ok) throw new Error('Validation failed')
      const validation = await validateRes.json()

      if (!validation.valid) {
        setPhase('error')
        setValidationError(validation.reason ?? "This doesn't look like a physical activity. Please try again.")
        return
      }

      // Step 2: Analyze with enriched_prompt
      setPhase('analyzing')

      const analyzeRes = await fetch('/api/analyze-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrichedPrompt: validation.enriched_prompt, weightKg }),
      })
      if (!analyzeRes.ok) throw new Error('Analysis failed')
      const data = await analyzeRes.json()

      setResult(data)
      setPhase('done')

    } catch {
      setPhase('error')
      setValidationError('Something went wrong. Please try again.')
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

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Quick Log</p>
          <div className="space-y-2">
            {favorites.map((fav) => (
              <FavoriteActivityRow
                key={fav.id}
                fav={fav}
                onLog={handleLogFavorite}
                onDelete={handleDeleteFavorite}
                isLogging={loggingFavoriteId === fav.id}
              />
            ))}
          </div>
        </div>
      )}

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
        disabled={phase === 'validating' || phase === 'analyzing'}
        className="w-full mt-5 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {phase === 'idle' && <><Sparkles size={16} /> Analyze with AI</>}
        {phase === 'validating' && <>Checking...</>}
        {phase === 'analyzing' && <>Analyzing...</>}
        {phase === 'done' && <><Sparkles size={16} /> Re-analyze</>}
        {phase === 'error' && <><Sparkles size={16} /> Analyze with AI</>}
      </button>

      {/* VALIDATING STATE */}
      {phase === 'validating' && (
        <div className="mt-5 bg-[#111118] border border-[#1E1E2E] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
            <span className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin block" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#F8FAFC]">Checking your activity...</p>
            <p className="text-xs text-[#64748B] mt-0.5">Making sure we can calculate this</p>
          </div>
        </div>
      )}

      {/* ANALYZING STATE */}
      {phase === 'analyzing' && (
        <div className="mt-5 bg-[#111118] border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <span className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin block" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F8FAFC]">Calculating calories burned...</p>
              <p className="text-xs text-[#64748B] mt-0.5">Using MET values and your weight</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-[#1A1A24] rounded-lg animate-pulse w-2/3" />
            <div className="h-8 bg-[#1A1A24] rounded-lg animate-pulse w-1/3" />
            <div className="h-4 bg-[#1A1A24] rounded-lg animate-pulse w-1/4 mt-1" />
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {phase === 'error' && validationError && (
        <div className="mt-5 bg-[#111118] border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle size={20} className="text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400 mb-1">Couldn&apos;t analyze this</p>
              <p className="text-sm text-[#64748B] leading-relaxed">{validationError}</p>
              <button
                onClick={() => { setPhase('idle'); setValidationError(null) }}
                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                ← Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DONE STATE */}
      {phase === 'done' && result && (
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
                <p className="text-sm text-[#64748B] mt-1">{result.durationMinutes} min</p>
              )}
            </div>
            <ConfidenceBadge confidence={result.confidence} />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              Log Activity
            </button>
            <button
              onClick={handleSaveFavorite}
              className="flex items-center justify-center gap-1.5 bg-[#1A1A24] hover:bg-[#2A2A3E] border border-[#1E1E2E] text-amber-400 rounded-xl px-3 py-2.5 font-semibold transition-colors"
              title="Save to favorites"
            >
              <Star size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
