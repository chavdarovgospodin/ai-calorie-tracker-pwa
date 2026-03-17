'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Save, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { calculateFromProfile } from '@/lib/calculations';
import type { UserProfile } from '@/lib/types';
import { useLocale } from '@/lib/locale-context';
import type { Locale } from '@/lib/i18n';

type ProfileFields = Pick<
  UserProfile,
  'age' | 'weight' | 'height' | 'gender' | 'goal' | 'activity_level'
>;

export default function SettingsPage() {
  const { t, locale, setLocale } = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [ageStr, setAgeStr] = useState('');
  const [age, setAge] = useState<number | undefined>(undefined);

  const [weightStr, setWeightStr] = useState('');
  const [weight, setWeight] = useState<number | undefined>(undefined);

  const [heightStr, setHeightStr] = useState('');
  const [height, setHeight] = useState<number | undefined>(undefined);

  const [gender, setGender] = useState<UserProfile['gender']>('male');
  const [goal, setGoal] = useState<UserProfile['goal']>('maintain');
  const [activityLevel, setActivityLevel] =
    useState<UserProfile['activity_level']>('moderately_active');

  const [waterGoalStr, setWaterGoalStr] = useState('2000');
  const [waterGoal, setWaterGoal] = useState<number | undefined>(2000);

  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: profileData } = useQuery<UserProfile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profileData) {
      setAgeStr(String(profileData.age));
      setAge(profileData.age);
      setWeightStr(String(profileData.weight));
      setWeight(profileData.weight);
      setHeightStr(String(profileData.height));
      setHeight(profileData.height);
      setGender(profileData.gender);
      setGoal(profileData.goal);
      setActivityLevel(profileData.activity_level);
      setWaterGoalStr(String(profileData?.daily_water_goal ?? 2000));
      setWaterGoal(profileData?.daily_water_goal ?? 2000);
    }
  }, [profileData]);

  const isLoading = !user || profileData === undefined;

  const hasChanges = profileData
    ? age !== profileData.age ||
      weight !== profileData.weight ||
      height !== profileData.height ||
      gender !== profileData.gender ||
      goal !== profileData.goal ||
      activityLevel !== profileData.activity_level ||
      waterGoal !== (profileData?.daily_water_goal ?? 2000)
    : false;

  const caloriePreview =
    age !== undefined && weight !== undefined && height !== undefined
      ? calculateFromProfile({
          age,
          weight,
          height,
          gender,
          goal,
          activity_level: activityLevel,
        } as ProfileFields)
      : null;

  async function handleSave() {
    if (age === undefined || weight === undefined || height === undefined) {
      toast.error(t.pleaseFillAllFields);
      return;
    }
    if (waterGoal === undefined) {
      toast.error('Water goal must be between 500 and 5000 ml');
      return;
    }
    setSaving(true);

    if (!user) { setSaving(false); return; }

    const profileFields: ProfileFields = {
      age,
      weight,
      height,
      gender,
      goal,
      activity_level: activityLevel,
    };

    const daily_calorie_target = calculateFromProfile(profileFields);

    const { error } = await supabase.from('user_profiles').upsert(
      {
        user_id: user.id,
        ...profileFields,
        daily_calorie_target,
        daily_water_goal: waterGoal,
        onboarding_completed: true,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      toast.error(t.failedToSave + ': ' + error.message);
    } else {
      toast.success(t.profileUpdated);
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    queryClient.clear();
    router.push('/login');
  }

  const inputClass =
    'w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors';
  const selectClass =
    'w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] outline-none transition-colors appearance-none';

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-8 bg-[#111118] rounded-xl animate-pulse mb-6 w-36" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-12 bg-[#111118] rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 pt-2">
        <h1 className="text-lg font-bold text-[#F8FAFC]">{t.settings}</h1>
      </div>

      {/* Account info */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 mb-5">
        <p className="text-xs text-[#64748B] mb-1">{t.account}</p>
        <p className="font-medium text-[#F8FAFC]">{user?.email}</p>
      </div>

      {/* Language Section */}
      <div className="bg-[#111118] border border-[#1E1E2E] rounded-2xl p-4 mb-5">
        <p className="text-xs text-[#64748B] mb-3">{t.language}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocale('en' as Locale)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              locale === 'en'
                ? 'bg-indigo-600 text-white'
                : 'bg-[#0A0A0F] border border-[#1E1E2E] text-[#64748B] hover:text-[#F8FAFC]'
            }`}
          >
            🇬🇧 {t.english}
          </button>
          <button
            onClick={() => setLocale('bg' as Locale)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              locale === 'bg'
                ? 'bg-indigo-600 text-white'
                : 'bg-[#0A0A0F] border border-[#1E1E2E] text-[#64748B] hover:text-[#F8FAFC]'
            }`}
          >
            🇧🇬 {t.bulgarian}
          </button>
        </div>
      </div>

      {/* Profile fields */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wide">
          Profile
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
              {t.age}
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={ageStr}
              onChange={(e) => {
                const val = e.target.value;
                setAgeStr(val);
                const n = parseInt(val, 10);
                if (!isNaN(n) && n >= 10 && n <= 120) {
                  setAge(n);
                } else {
                  setAge(undefined);
                }
              }}
              className={inputClass}
              placeholder="25"
              min={10}
              max={120}
            />
            {ageStr && age === undefined && (
              <p className="text-xs text-red-400 mt-1">{t.invalidAge}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
              {t.weight} (kg)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weightStr}
              onChange={(e) => {
                const val = e.target.value;
                setWeightStr(val);
                const n = parseFloat(val);
                if (!isNaN(n) && n >= 20 && n <= 300) {
                  setWeight(n);
                } else {
                  setWeight(undefined);
                }
              }}
              className={inputClass}
              placeholder="70"
              min={20}
              max={300}
              step={0.1}
            />
            {weightStr && weight === undefined && (
              <p className="text-xs text-red-400 mt-1">{t.invalidWeight}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
              {t.height} (cm)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={heightStr}
              onChange={(e) => {
                const val = e.target.value;
                setHeightStr(val);
                const n = parseFloat(val);
                if (!isNaN(n) && n >= 100 && n <= 250) {
                  setHeight(n);
                } else {
                  setHeight(undefined);
                }
              }}
              className={inputClass}
              placeholder="175"
              min={100}
              max={250}
              step={0.1}
            />
            {heightStr && height === undefined && (
              <p className="text-xs text-red-400 mt-1">{t.invalidHeight}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
            {t.biologicalSex}
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as UserProfile['gender'])}
            className={selectClass}
          >
            <option value="male">{t.male}</option>
            <option value="female">{t.female}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
            {t.goal}
          </label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as UserProfile['goal'])}
            className={selectClass}
          >
            <option value="lose">{t.loseWeight}</option>
            <option value="maintain">{t.maintainWeight}</option>
            <option value="gain">{t.gainMuscle}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
            {t.activityLevel}
          </label>
          <select
            value={activityLevel}
            onChange={(e) =>
              setActivityLevel(e.target.value as UserProfile['activity_level'])
            }
            className={selectClass}
          >
            <option value="sedentary">{t.sedentary}</option>
            <option value="lightly_active">{t.lightlyActive}</option>
            <option value="moderately_active">{t.moderatelyActive}</option>
            <option value="very_active">{t.veryActive}</option>
            <option value="extremely_active">{t.extremelyActive}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
            {t.dailyWaterGoal}
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={waterGoalStr}
            onChange={(e) => {
              const val = e.target.value;
              setWaterGoalStr(val);
              const n = parseInt(val, 10);
              if (!isNaN(n) && n >= 500 && n <= 5000) {
                setWaterGoal(n);
              } else {
                setWaterGoal(undefined);
              }
            }}
            className={inputClass}
            placeholder="2000"
            min={500}
            max={5000}
            step={100}
          />
          {waterGoalStr && waterGoal === undefined && (
            <p className="text-xs text-red-400 mt-1">Water goal must be between 500 and 5000 ml</p>
          )}
        </div>

        {caloriePreview && (
          <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/30">
            <p className="text-xs text-[#64748B]">{t.calculatedDailyTarget}</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">
              {caloriePreview.toLocaleString()} {t.kcal}
            </p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges || age === undefined || weight === undefined || height === undefined || waterGoal === undefined}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {t.saveChanges}
        </button>
      </div>

      {/* Logout */}
      <div className="mt-8 mb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl px-5 py-2.5 font-semibold transition-colors"
        >
          <LogOut size={16} />
          {t.logout}
        </button>
      </div>
    </div>
  );
}
