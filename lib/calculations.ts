import type { UserProfile } from './types'

export function calculateBMR(age: number, weight: number, height: number, gender: 'male' | 'female'): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161
  }
}

export function getActivityMultiplier(activityLevel: UserProfile['activity_level']): number {
  const multipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  }
  return multipliers[activityLevel]
}

export function calculateTDEE(bmr: number, activityLevel: UserProfile['activity_level']): number {
  return Math.round(bmr * getActivityMultiplier(activityLevel))
}

export function calculateDailyTarget(tdee: number, goal: UserProfile['goal']): number {
  const adjustments = {
    lose: -500,
    maintain: 0,
    gain: 300,
  }
  return tdee + adjustments[goal]
}

export function getDynamicTarget(baseTarget: number, caloriesBurned: number): number {
  return baseTarget + caloriesBurned
}

export function calculateFromProfile(profile: Pick<UserProfile, 'age' | 'weight' | 'height' | 'gender' | 'activity_level' | 'goal'>): number {
  const bmr = calculateBMR(profile.age, profile.weight, profile.height, profile.gender)
  const tdee = calculateTDEE(bmr, profile.activity_level)
  return calculateDailyTarget(tdee, profile.goal)
}
