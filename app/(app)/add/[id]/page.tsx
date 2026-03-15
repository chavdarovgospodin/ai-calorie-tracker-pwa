'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function EditFoodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function loadEntry() {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Entry not found')
        router.back()
        return
      }

      setName(data.name)
      setCalories(String(data.calories))
      setProtein(data.protein !== null ? String(data.protein) : '')
      setCarbs(data.carbs !== null ? String(data.carbs) : '')
      setFat(data.fat !== null ? String(data.fat) : '')
      setFiber(data.fiber !== null ? String(data.fiber) : '')
      setQuantity(data.quantity ?? '')
      setNotes(data.notes ?? '')
      setLoading(false)
    }
    loadEntry()
  }, [id, router, supabase])

  async function handleSave() {
    if (!name || !calories) {
      toast.error('Name and calories are required')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('food_entries')
      .update({
        name,
        calories: Number(calories),
        protein: protein ? Number(protein) : null,
        carbs: carbs ? Number(carbs) : null,
        fat: fat ? Number(fat) : null,
        fiber: fiber ? Number(fiber) : null,
        quantity: quantity || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Entry updated!')
      router.back()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this entry?')) return
    setDeleting(true)
    const { error } = await supabase.from('food_entries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Entry deleted')
      router.push('/')
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-[#111118] rounded-xl animate-pulse mb-6 w-48" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-[#111118] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const inputClass = "w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"

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
        <h1 className="text-lg font-bold text-[#F8FAFC] flex-1">Edit Food</h1>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Food name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Calories *</label>
          <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} className={inputClass} placeholder="0" min={0} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Protein (g)</label>
            <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} className={inputClass} placeholder="0" min={0} step={0.1} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Carbs (g)</label>
            <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} className={inputClass} placeholder="0" min={0} step={0.1} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Fat (g)</label>
            <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} className={inputClass} placeholder="0" min={0} step={0.1} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Fiber (g)</label>
          <input type="number" value={fiber} onChange={(e) => setFiber(e.target.value)} className={inputClass} placeholder="0" min={0} step={0.1} />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Quantity</label>
          <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} placeholder="e.g. 1 plate, 200g" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Any notes" />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50"
      >
        {saving ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Save size={16} />
        )}
        Save Changes
      </button>
    </div>
  )
}
