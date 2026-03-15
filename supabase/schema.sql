-- Enable RLS on all tables

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  age INTEGER NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  goal TEXT NOT NULL CHECK (goal IN ('lose', 'maintain', 'gain')),
  activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  daily_calorie_target INTEGER NOT NULL,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  fiber DECIMAL(6,2),
  quantity TEXT,
  photo_url TEXT,
  ai_confidence DECIMAL(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  calories_burned INTEGER NOT NULL,
  ai_confidence DECIMAL(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their food entries" ON food_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their activity entries" ON activity_entries FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_food_entries_user_date ON food_entries(user_id, date);
CREATE INDEX idx_activity_entries_user_date ON activity_entries(user_id, date);
