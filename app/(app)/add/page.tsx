'use client'

import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Camera, FileText, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { FoodAnalysis } from '@/lib/types'

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
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const [tab, setTab] = useState<'text' | 'photo'>('text')
  const [text, setText] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<FoodAnalysis | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setResult(null)
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

    setAnalyzing(true)
    setResult(null)

    try {
      let body: Record<string, string>
      if (tab === 'photo' && imageFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result as string
            resolve(dataUrl.split(',')[1])
          }
          reader.onerror = reject
          reader.readAsDataURL(imageFile)
        })
        body = { imageBase64: base64, description }
      } else {
        body = { text }
      }

      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setResult(data)
    } catch {
      toast.error('Failed to analyze food. Please try again.')
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
              placeholder="e.g. 2 scrambled eggs with toast and a cup of orange juice"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors resize-none"
            />
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
          <div className="h-4 bg-[#1A1A24] rounded-lg animate-pulse w-1/2" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-[#1A1A24] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Result card */}
      {result && !analyzing && (
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
