'use client'

import { useState, useRef, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Camera, FileText, Sparkles, CheckCircle, AlertCircle, Star, Trash2 as TrashIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { FoodAnalysis, FavoriteFood } from '@/lib/types'

type AnalysisPhase = 'idle' | 'validating' | 'analyzing' | 'done' | 'error'

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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

function FavoriteFoodRow({
  fav,
  onLog,
  onDelete,
  isLogging,
}: {
  fav: FavoriteFood
  onLog: (fav: FavoriteFood) => void
  onDelete: (id: string) => void
  isLogging: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirmRef.current) {
      confirmRef.current = true
      setConfirmDelete(true)
      timerRef.current = setTimeout(() => {
        confirmRef.current = false
        setConfirmDelete(false)
      }, 3000)
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    confirmRef.current = false
    setConfirmDelete(false)
    onDelete(fav.id)
  }

  return (
    <div className="bg-[#111118] border border-[#1E1E2E] rounded-xl px-3 py-2.5 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#F8FAFC] truncate">{fav.name}</p>
        <p className="text-xs text-[#64748B]">{fav.calories} kcal</p>
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
            ? 'bg-red-500 text-white animate-pulse'
            : 'text-[#64748B] hover:text-red-400'
        }`}
      >
        {confirmDelete ? '?' : <TrashIcon size={13} />}
      </button>
    </div>
  )
}

export default function AddFoodPage() {
  return (
    <Suspense fallback={<div className="p-4"><div className="h-12 bg-[#111118] rounded-xl animate-pulse" /></div>}>
      <AddFood />
    </Suspense>
  )
}

function AddFood() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA')
  const [tab, setTab] = useState<'text' | 'photo'>('text')
  const [text, setText] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])
  const [phase, setPhase] = useState<AnalysisPhase>('idle')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [result, setResult] = useState<FoodAnalysis | null>(null)
  const [saving, setSaving] = useState(false)
  const [loggingFavoriteId, setLoggingFavoriteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    },
  })

  const { data: favorites = [] } = useQuery<FavoriteFood[]>({
    queryKey: ['favorite_foods', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('favorite_foods')
        .select('*')
        .eq('user_id', user!.id)
        .order('use_count', { ascending: false })
        .limit(10)
      return data ?? []
    },
    enabled: !!user,
  })

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setResult(null)
      setPhase('idle')
      setValidationError(null)
    }
  }

  async function handleAnalyze() {
    if (tab === 'text' && !text.trim()) {
      toast.error('Please describe your meal')
      return
    }
    if (tab === 'photo' && !imageFile) {
      toast.error('Please select a photo')
      return
    }

    setPhase('validating')
    setValidationError(null)
    setResult(null)

    try {
      let cachedBase64: string | null = null
      if (tab === 'photo' && imageFile) {
        cachedBase64 = await toBase64(imageFile)
      }

      let body: Record<string, string>
      if (tab === 'photo' && cachedBase64) {
        body = { imageBase64: cachedBase64, mimeType: imageFile!.type, description }
      } else {
        body = { text }
      }

      const validateRes = await fetch('/api/validate-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!validateRes.ok) throw new Error('Validation request failed')
      const validation = await validateRes.json()

      if (!validation.valid) {
        setPhase('error')
        setValidationError(validation.reason ?? "This doesn't look like food. Please try again.")
        return
      }

      setPhase('analyzing')

      const analyzeBody: Record<string, string> = {
        enrichedPrompt: validation.enriched_prompt,
      }
      if (tab === 'photo' && cachedBase64) {
        analyzeBody.imageBase64 = cachedBase64
        analyzeBody.mimeType = imageFile!.type
      }

      const analyzeRes = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyzeBody),
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

  async function handleSaveFavorite() {
    if (!result || !user) return
    setSaving(true)

    const { data: existing } = await supabase
      .from('favorite_foods')
      .select('id, use_count')
      .eq('user_id', user.id)
      .ilike('name', result.name)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('favorite_foods')
        .update({
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          fiber: result.fiber,
          use_count: existing.use_count + 1,
        })
        .eq('id', existing.id)

      if (error) {
        toast.error('Failed to update favorite')
      } else {
        queryClient.invalidateQueries({ queryKey: ['favorite_foods', user.id] })
        toast.success('Favorite updated ⭐')
      }
    } else {
      const { error } = await supabase
        .from('favorite_foods')
        .insert({
          user_id: user.id,
          name: result.name,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          fiber: result.fiber,
          use_count: 1,
        })

      if (error) {
        toast.error('Failed to save favorite')
      } else {
        queryClient.invalidateQueries({ queryKey: ['favorite_foods', user.id] })
        toast.success('Added to favorites ⭐')
      }
    }

    setSaving(false)
  }

  async function handleLogFavorite(fav: FavoriteFood) {
    if (!user) return
    setLoggingFavoriteId(fav.id)

    const { error } = await supabase.from('food_entries').insert({
      user_id: user.id,
      date,
      name: fav.name,
      calories: fav.calories,
      protein: fav.protein,
      carbs: fav.carbs,
      fat: fav.fat,
      fiber: fav.fiber,
      quantity: null,
      notes: null,
      ai_confidence: null,
    })

    if (error) {
      toast.error('Failed to log food')
      setLoggingFavoriteId(null)
      return
    }

    await supabase
      .from('favorite_foods')
      .update({ use_count: fav.use_count + 1 })
      .eq('id', fav.id)

    queryClient.invalidateQueries({ queryKey: ['food_entries'] })
    queryClient.invalidateQueries({ queryKey: ['favorite_foods', user.id] })
    toast.success(`${fav.name} logged!`)
    router.push(`/?date=${date}`)
  }

  async function handleDeleteFavorite(id: string) {
    if (!user) return
    const { error } = await supabase.from('favorite_foods').delete().eq('id', id)
    if (error) {
      toast.error('Failed to remove favorite')
    } else {
      queryClient.invalidateQueries({ queryKey: ['favorite_foods', user.id] })
    }
  }

  async function handleSave() {
    if (!result || !user) return
    setSaving(true)

    const { error } = await supabase.from('food_entries').insert({
      user_id: user.id,
      date,
      name: result.name,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      fiber: result.fiber,
      quantity: quantity || null,
      notes: notes || null,
      ai_confidence: result.confidence,
    })

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      queryClient.invalidateQueries({ queryKey: ['food_entries'] })
      toast.success('Food logged!')
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
        <h1 className="text-lg font-bold text-[#F8FAFC]">Add Food</h1>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Quick Add</p>
          <div className="space-y-2">
            {favorites.map((fav) => (
              <FavoriteFoodRow
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

      {/* Tabs */}
      <div className="flex bg-[#111118] border border-[#1E1E2E] rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab('text')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'text' ? 'bg-indigo-600 text-white' : 'text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          <FileText size={15} />
          Text
        </button>
        <button
          onClick={() => setTab('photo')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'photo' ? 'bg-indigo-600 text-white' : 'text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          <Camera size={15} />
          Photo
        </button>
      </div>

      {/* Text Tab */}
      {tab === 'text' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Describe your meal</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="e.g. 2 scrambled eggs with toast and a cup of orange juice"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors resize-none"
            />
            <p className={`text-xs mt-1 text-right ${text.length > 450 ? 'text-red-400' : 'text-[#64748B]'}`}>
              {text.length} / 500
            </p>
          </div>
        </div>
      )}

      {/* Photo Tab */}
      {tab === 'photo' && (
        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="w-full h-48 object-cover rounded-2xl border border-[#1E1E2E]"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-[#0A0A0F]/80 backdrop-blur-sm border border-[#1E1E2E] text-[#F8FAFC] rounded-xl px-3 py-1.5 text-xs font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 bg-[#111118] border-2 border-dashed border-[#1E1E2E] hover:border-indigo-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <Camera size={28} className="text-[#64748B]" />
                <span className="text-sm text-[#64748B]">Tap to take or select a photo</span>
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Additional description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. large portion, extra sauce"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* Quantity & Notes */}
      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Quantity (optional)</label>
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 1 plate, 200g"
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes"
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={phase === 'validating' || phase === 'analyzing' || (tab === 'text' && text.length > 500)}
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
            <p className="text-sm font-semibold text-[#F8FAFC]">Checking your input...</p>
            <p className="text-xs text-[#64748B] mt-0.5">Making sure this is food we can analyze</p>
          </div>
        </div>
      )}

      {/* ANALYZING STATE */}
      {phase === 'analyzing' && (
        <div className="mt-5 bg-[#111118] border border-indigo-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
              <span className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin block" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F8FAFC]">Analyzing nutrition...</p>
              <p className="text-xs text-[#64748B] mt-0.5">Calculating calories and macros</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-5 bg-[#1A1A24] rounded-lg animate-pulse w-2/3" />
            <div className="h-8 bg-[#1A1A24] rounded-lg animate-pulse w-1/3" />
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="h-10 bg-[#1A1A24] rounded-lg animate-pulse" />
              <div className="h-10 bg-[#1A1A24] rounded-lg animate-pulse" />
              <div className="h-10 bg-[#1A1A24] rounded-lg animate-pulse" />
            </div>
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
                onClick={() => {
                  setPhase('idle')
                  setValidationError(null)
                }}
                className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                ← Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DONE STATE — result card */}
      {phase === 'done' && result && (
        <div className="mt-4 bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-[#F8FAFC]">{result.name}</h3>
              <p className="text-2xl font-bold text-[#F8FAFC] mt-1">{result.calories} <span className="text-sm font-normal text-[#64748B]">kcal</span></p>
            </div>
            <ConfidenceBadge confidence={result.confidence} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0A0A0F] rounded-xl p-3 text-center">
              <p className="text-xs text-[#64748B] mb-1">Protein</p>
              <p className="font-bold text-indigo-400">{result.protein}g</p>
            </div>
            <div className="bg-[#0A0A0F] rounded-xl p-3 text-center">
              <p className="text-xs text-[#64748B] mb-1">Carbs</p>
              <p className="font-bold text-emerald-400">{result.carbs}g</p>
            </div>
            <div className="bg-[#0A0A0F] rounded-xl p-3 text-center">
              <p className="text-xs text-[#64748B] mb-1">Fat</p>
              <p className="font-bold text-amber-400">{result.fat}g</p>
            </div>
          </div>
          {result.fiber > 0 && (
            <p className="text-xs text-[#64748B] mt-2 text-center">Fiber: {result.fiber}g</p>
          )}
          <div className="flex gap-2 mt-4">
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
              Save to diary
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
