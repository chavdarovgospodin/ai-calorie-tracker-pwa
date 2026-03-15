'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [description, setDescription] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState('')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function loadEntry() {
      const { data, error } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Activity not found')
        router.back()
        return
      }

      setDescription(data.description)
      setCaloriesBurned(String(data.calories_burned))
      setNotes(data.notes ?? '')
      setLoading(false)
    }
    loadEntry()
  }, [id, router, supabase])

  async function handleSave() {
    if (!description || !caloriesBurned) {
      toast.error('Description and calories burned are required')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('activity_entries')
      .update({
        description,
        calories_burned: Number(caloriesBurned),
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Activity updated!')
      router.back()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this activity?')) return
    setDeleting(true)
    const { error } = await supabase.from('activity_entries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Activity deleted')
      router.push('/')
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-[#111118] rounded-xl animate-pulse mb-6 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
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
        <h1 className="text-lg font-bold text-[#F8FAFC] flex-1">Edit Activity</h1>
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
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Activity description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-3 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors resize-none"
            placeholder="e.g. 30 min running"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Calories burned *</label>
          <input
            type="number"
            value={caloriesBurned}
            onChange={(e) => setCaloriesBurned(e.target.value)}
            className={inputClass}
            placeholder="0"
            min={0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            placeholder="Any notes"
          />
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
