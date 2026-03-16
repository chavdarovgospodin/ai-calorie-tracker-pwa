'use client';

import { useState } from 'react';
import { TrendingDown, Minus, TrendingUp } from 'lucide-react';
import { calculateFromProfile } from '@/lib/calculations';
import type { UserProfile } from '@/lib/types';

type OnboardingData = Pick<
  UserProfile,
  'age' | 'weight' | 'height' | 'gender' | 'activity_level' | 'goal'
>;

interface OnboardingStepsProps {
  onComplete: (data: OnboardingData) => void;
}

const activityOptions: {
  value: UserProfile['activity_level'];
  label: string;
  desc: string;
}[] = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    desc: 'Little or no exercise, desk job',
  },
  {
    value: 'lightly_active',
    label: 'Lightly Active',
    desc: 'Light exercise 1-3 days/week',
  },
  {
    value: 'moderately_active',
    label: 'Moderately Active',
    desc: 'Moderate exercise 3-5 days/week',
  },
  {
    value: 'very_active',
    label: 'Very Active',
    desc: 'Hard exercise 6-7 days/week',
  },
  {
    value: 'extremely_active',
    label: 'Extremely Active',
    desc: 'Very hard exercise, physical job',
  },
];

export default function OnboardingSteps({ onComplete }: OnboardingStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    gender: undefined,
    age: undefined,
    weight: undefined,
    height: undefined,
    goal: undefined,
    activity_level: undefined,
  });

  const totalSteps = 4;

  function isStepComplete() {
    switch (currentStep) {
      case 0:
        return !!formData.gender;
      case 1:
        return !!(formData.age && formData.weight && formData.height);
      case 2:
        return !!formData.goal;
      case 3:
        return !!formData.activity_level;
      default:
        return false;
    }
  }

  function handleNext() {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete(formData as OnboardingData);
    }
  }

  const caloriePreview =
    formData.age &&
    formData.weight &&
    formData.height &&
    formData.gender &&
    formData.activity_level &&
    formData.goal
      ? calculateFromProfile(formData as OnboardingData)
      : null;

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            CALIO
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Let&apos;s set up your profile
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#64748B]">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span className="text-xs text-[#64748B]">
              {Math.round(((currentStep + 1) / totalSteps) * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#1E1E2E]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div>
          {/* Step 0: Gender */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">
                What&apos;s your gender?
              </h2>
              <p className="text-[#64748B] text-sm mb-6">
                Used to calculate your metabolic rate
              </p>
              <div className="grid grid-cols-2 gap-4">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setFormData((d) => ({ ...d, gender: g }))}
                    className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                      formData.gender === g
                        ? 'border-indigo-500 bg-indigo-600/10'
                        : 'border-[#1E1E2E] bg-[#111118] hover:border-[#2A2A3E]'
                    }`}
                  >
                    <span className="text-4xl">{g === 'male' ? '♂' : '♀'}</span>
                    <span className="font-semibold text-[#F8FAFC] capitalize">
                      {g}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Stats */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">
                Your measurements
              </h2>
              <p className="text-[#64748B] text-sm mb-6">
                We&apos;ll use these to calculate your calorie needs
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={formData.age ?? ''}
                    onChange={(e) =>
                      setFormData((d) => ({
                        ...d,
                        age: Number(e.target.value),
                      }))
                    }
                    placeholder="25"
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step={0.1}
                    value={formData.weight ?? ''}
                    onChange={(e) =>
                      setFormData((d) => ({
                        ...d,
                        weight: Number(e.target.value),
                      }))
                    }
                    placeholder="70"
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={250}
                    step={0.1}
                    value={formData.height ?? ''}
                    onChange={(e) =>
                      setFormData((d) => ({
                        ...d,
                        height: Number(e.target.value),
                      }))
                    }
                    placeholder="175"
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2E] focus:border-indigo-500 rounded-xl px-4 py-2.5 text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goal */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">
                What&apos;s your goal?
              </h2>
              <p className="text-[#64748B] text-sm mb-6">
                We&apos;ll adjust your calorie target accordingly
              </p>
              <div className="space-y-3">
                {[
                  {
                    value: 'lose' as const,
                    label: 'Lose Weight',
                    desc: '500 kcal deficit per day',
                    Icon: TrendingDown,
                    color: 'text-blue-400',
                  },
                  {
                    value: 'maintain' as const,
                    label: 'Maintain Weight',
                    desc: 'Stay at current weight',
                    Icon: Minus,
                    color: 'text-indigo-400',
                  },
                  {
                    value: 'gain' as const,
                    label: 'Gain Muscle',
                    desc: '300 kcal surplus per day',
                    Icon: TrendingUp,
                    color: 'text-emerald-400',
                  },
                ].map(({ value, label, desc, Icon, color }) => (
                  <button
                    key={value}
                    onClick={() => setFormData((d) => ({ ...d, goal: value }))}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all text-left ${
                      formData.goal === value
                        ? 'border-indigo-500 bg-indigo-600/10'
                        : 'border-[#1E1E2E] bg-[#111118] hover:border-[#2A2A3E]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl bg-[#0A0A0F] ${color}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-[#F8FAFC]">{label}</p>
                      <p className="text-xs text-[#64748B]">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Activity Level */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">
                How active are you?
              </h2>
              <p className="text-[#64748B] text-sm mb-6">
                Choose your typical weekly activity level
              </p>
              <div className="space-y-2">
                {activityOptions.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() =>
                      setFormData((d) => ({ ...d, activity_level: value }))
                    }
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all text-left ${
                      formData.activity_level === value
                        ? 'border-indigo-500 bg-indigo-600/10'
                        : 'border-[#1E1E2E] bg-[#111118] hover:border-[#2A2A3E]'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-[#F8FAFC]">{label}</p>
                      <p className="text-xs text-[#64748B]">{desc}</p>
                    </div>
                    {formData.activity_level === value && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {caloriePreview && (
                <div className="mt-5 p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/30">
                  <p className="text-sm text-[#64748B]">
                    Your estimated daily target
                  </p>
                  <p className="text-2xl font-bold text-indigo-400 mt-1">
                    {caloriePreview.toLocaleString()} kcal
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* end scrollable */}

      {/* Sticky navigation buttons */}
      <div className="sticky bottom-0 bg-[#0A0A0F] border-t border-[#1E1E2E] px-5 py-4">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex-1 bg-[#1A1A24] hover:bg-[#2A2A3E] border border-[#1E1E2E] text-[#F8FAFC] rounded-xl px-5 py-2.5 font-semibold transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!isStepComplete()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {currentStep === totalSteps - 1 ? 'Start Tracking' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
