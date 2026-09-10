'use client';

import { useState, useEffect } from 'react';
import { Flame, Star, CheckCircle, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ActivityEntry } from '@/lib/types';
import { useLocale } from '@/lib/locale-context';
import { invalidateDayData } from '@/lib/query-keys';

interface ActivityDetailSheetProps {
  entry: ActivityEntry | null;
  date: string;
  today: string;
  userId: string;
  onClose: () => void;
}

export default function ActivityDetailSheet({
  entry,
  date,
  today,
  userId,
  onClose,
}: ActivityDetailSheetProps) {
  const { t } = useLocale();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showLogOptions, setShowLogOptions] = useState(false);
  const [editing, setEditing] = useState(false);
  const isPastDay = date < today;

  const [fDescription, setFDescription] = useState('');
  const [fCalories, setFCalories] = useState('');
  const [fDuration, setFDuration] = useState('');
  const [fNotes, setFNotes] = useState('');

  useEffect(() => {
    if (!entry) return;
    supabase
      .from('favorite_activities')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', entry.description)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
    return () => {
      setSaving(false);
      setIsFavorite(false);
      setEditing(false);
    };
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function startEditing() {
    if (!entry) return;
    setFDescription(entry.description);
    setFCalories(String(entry.calories_burned));
    setFDuration(entry.duration_minutes != null ? String(entry.duration_minutes) : '');
    setFNotes(entry.notes ?? '');
    setShowLogOptions(false);
    setEditing(true);
  }

  if (!entry) return null;

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(t.dateLocale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function handleSaveEdit() {
    if (saving) return;
    const description = fDescription.trim();
    if (!description) {
      toast.error(t.pleaseDescribeWorkout);
      return;
    }
    const calRaw = parseFloat(fCalories);
    if (isNaN(calRaw) || calRaw < 0) {
      toast.error(t.noNegativeValues);
      return;
    }
    const calories_burned = Math.round(calRaw);
    if (calories_burned <= 0) {
      toast.error(t.caloriesMustBePositive);
      return;
    }
    let duration_minutes: number | null = null;
    if (fDuration.trim() !== '') {
      const d = parseFloat(fDuration);
      if (isNaN(d) || d < 0) {
        toast.error(t.noNegativeValues);
        return;
      }
      duration_minutes = Math.round(d);
    }

    setSaving(true);
    const { error } = await supabase
      .from('activity_entries')
      .update({ description, calories_burned, duration_minutes, notes: fNotes.trim() || null })
      .eq('id', entry!.id);
    if (error) {
      toast.error(t.failedToUpdate);
      setSaving(false);
    } else {
      invalidateDayData(queryClient, 'activity_entries', date);
      toast.success(t.activityUpdated);
      setSaving(false);
      setEditing(false);
      onClose();
    }
  }

  async function handleToggleFavorite() {
    if (saving) return;
    setSaving(true);

    if (isFavorite) {
      const { error } = await supabase
        .from('favorite_activities')
        .delete()
        .eq('user_id', userId)
        .ilike('name', entry!.description);
      if (error) {
        toast.error(t.failedToRemoveFavorite);
      } else {
        setIsFavorite(false);
        queryClient.invalidateQueries({
          queryKey: ['favorite_activities', userId],
        });
        toast.success(t.removedFromFavorites);
      }
    } else {
      const { data: existing } = await supabase
        .from('favorite_activities')
        .select('id, use_count')
        .eq('user_id', userId)
        .ilike('name', entry!.description)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('favorite_activities')
          .update({
            calories_burned: entry!.calories_burned,
            duration_minutes: entry!.duration_minutes,
            use_count: existing.use_count + 1,
          })
          .eq('id', existing.id);
        toast.success(t.favoriteUpdated);
      } else {
        await supabase.from('favorite_activities').insert({
          user_id: userId,
          name: entry!.description,
          calories_burned: entry!.calories_burned,
          duration_minutes: entry!.duration_minutes,
          use_count: 1,
        });
        toast.success(t.addedToFavoritesActivity);
      }
      setIsFavorite(true);
      queryClient.invalidateQueries({
        queryKey: ['favorite_activities', userId],
      });
    }
    setSaving(false);
  }

  async function doLog(targetDate: string) {
    setSaving(true);
    const { error } = await supabase.from('activity_entries').insert({
      user_id: userId,
      date: targetDate,
      description: entry!.description,
      calories_burned: entry!.calories_burned,
      duration_minutes: entry!.duration_minutes,
      notes: entry!.notes,
      ai_confidence: entry!.ai_confidence,
    });
    if (error) {
      toast.error(t.failedToSave);
      setSaving(false);
    } else {
      invalidateDayData(queryClient, 'activity_entries', targetDate);
      toast.success(t.activityLogged);
      setSaving(false);
      onClose();
    }
  }

  function handleLogAgainClick() {
    if (saving) return;
    if (isPastDay) {
      setShowLogOptions(true);
    } else {
      doLog(date);
    }
  }

  const editInput =
    'w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-[400px] mx-auto bg-[#111118] border border-[#1E1E2E] rounded-2xl px-4 pb-5 pt-4 max-h-[90vh] overflow-y-auto">
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {!editing && (
            <button
              onClick={startEditing}
              className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"
              title={t.edit}
            >
              <Pencil size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {editing ? (
          /* ---------- EDIT MODE ---------- */
          <div className="pt-1 pr-14">
            <label className="block text-xs text-[#64748B] mb-1">{t.activityName}</label>
            <input
              value={fDescription}
              onChange={(e) => setFDescription(e.target.value)}
              className={`${editInput} mb-3`}
            />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs text-[#64748B] mb-1">{t.caloriesBurned}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={fCalories}
                  onChange={(e) => setFCalories(e.target.value)}
                  className={editInput}
                />
              </div>
              <div>
                <label className="block text-xs text-[#64748B] mb-1">
                  {t.duration} ({t.min})
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={fDuration}
                  onChange={(e) => setFDuration(e.target.value)}
                  className={editInput}
                />
              </div>
            </div>
            <label className="block text-xs text-[#64748B] mb-1">{t.notes}</label>
            <input
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              className={`${editInput} mb-4`}
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={15} />
                )}
                {t.save}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex items-center justify-center bg-[#1A1A24] hover:bg-[#2A2A3E] border border-[#1E1E2E] text-[#F8FAFC] rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          /* ---------- VIEW MODE ---------- */
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-4 pr-14 pt-1">
              <div className="flex-1 min-w-0 mr-3">
                <h3 className="font-bold text-[#F8FAFC] text-lg leading-tight mb-1.5">
                  {entry.description}
                </h3>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5">
                  <Flame size={18} className="text-amber-400" />
                  <p className="text-3xl font-bold text-amber-400 leading-none">
                    {entry.calories_burned}
                  </p>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">{t.kcalBurned}</p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-[#0A0A0F] rounded-xl px-3 py-1 mb-4 divide-y divide-[#1E1E2E]">
              {entry.duration_minutes != null && entry.duration_minutes > 0 && (
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-[#64748B]">{t.duration}</span>
                  <span className="text-sm text-[#F8FAFC]">
                    {entry.duration_minutes} {t.min}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-[#64748B]">{t.addedAt}</span>
                <span className="text-sm text-[#F8FAFC]">
                  {formatTime(entry.created_at)}
                </span>
              </div>
              {entry.notes && (
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-[#64748B]">{t.notes}</span>
                  <span className="text-sm text-[#F8FAFC] text-right max-w-[60%]">
                    {entry.notes}
                  </span>
                </div>
              )}
            </div>

            {/* Log date picker (shown only on past days) */}
            {showLogOptions && (
              <div className="mb-3 bg-[#0A0A0F] rounded-xl divide-y divide-[#1E1E2E] border border-[#1E1E2E]">
                <button
                  onClick={() => doLog(date)}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 text-sm text-[#F8FAFC] hover:bg-[#1A1A24] transition-colors rounded-t-xl disabled:opacity-50"
                >
                  {t.logAgainForDate}
                </button>
                <button
                  onClick={() => doLog(today)}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 text-sm text-indigo-400 font-semibold hover:bg-[#1A1A24] transition-colors rounded-b-xl disabled:opacity-50"
                >
                  {t.logAgainForToday}
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleLogAgainClick}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={15} />
                )}
                {t.logAgain}
              </button>
              <button
                onClick={handleToggleFavorite}
                disabled={saving}
                className="flex items-center justify-center bg-[#1A1A24] hover:bg-[#2A2A3E] border border-[#1E1E2E] text-amber-400 rounded-xl px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={isFavorite ? t.removeFromFavorites : t.saveToFavorites}
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                ) : (
                  <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
