export interface UserProfile {
  id: string
  user_id: string
  age: number
  weight: number
  height: number
  gender: 'male' | 'female'
  goal: 'lose' | 'maintain' | 'gain'
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active'
  daily_calorie_target: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface FoodEntry {
  id: string
  user_id: string
  date: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  quantity: string | null
  photo_url: string | null
  ai_confidence: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ActivityEntry {
  id: string
  user_id: string
  date: string
  description: string
  calories_burned: number
  ai_confidence: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FoodAnalysis {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  confidence: number
}

export interface ActivityAnalysis {
  activityName: string
  caloriesBurned: number
  durationMinutes: number
  confidence: number
}

export interface ValidationResult {
  valid: boolean
  reason: string | null
  enriched_prompt: string | null
}

export interface DailyStats {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  totalBurned: number
  netCalories: number
}
