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

CREATE TABLE favorite_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  fiber DECIMAL(6,2),
  use_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE favorite_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  calories_burned INTEGER NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE favorite_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their favorite foods" ON favorite_foods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their favorite activities" ON favorite_activities FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_favorite_foods_user ON favorite_foods(user_id);
CREATE INDEX idx_favorite_activities_user ON favorite_activities(user_id);

-- =============================================
-- updated_at auto-update triggers
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_food_entries_updated_at
  BEFORE UPDATE ON food_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_activity_entries_updated_at
  BEFORE UPDATE ON activity_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- CHECK constraints за валидни стойности
-- =============================================

ALTER TABLE food_entries
  ADD CONSTRAINT chk_food_calories
    CHECK (calories >= 0 AND calories <= 10000),
  ADD CONSTRAINT chk_food_protein
    CHECK (protein IS NULL OR (protein >= 0 AND protein <= 1000)),
  ADD CONSTRAINT chk_food_carbs
    CHECK (carbs IS NULL OR (carbs >= 0 AND carbs <= 1000)),
  ADD CONSTRAINT chk_food_fat
    CHECK (fat IS NULL OR (fat >= 0 AND fat <= 1000)),
  ADD CONSTRAINT chk_food_fiber
    CHECK (fiber IS NULL OR (fiber >= 0 AND fiber <= 500));

ALTER TABLE activity_entries
  ADD CONSTRAINT chk_activity_calories_burned
    CHECK (calories_burned >= 0 AND calories_burned <= 10000);

ALTER TABLE user_profiles
  ADD CONSTRAINT chk_profile_age
    CHECK (age >= 10 AND age <= 120),
  ADD CONSTRAINT chk_profile_weight
    CHECK (weight >= 20 AND weight <= 300),
  ADD CONSTRAINT chk_profile_height
    CHECK (height >= 100 AND height <= 250);
