-- =============================================================================
-- Calio — canonical schema
--
-- POLICY: this file is a MIRROR of the live production database, not a wishlist.
-- If prod does not have a constraint/index, it does not belong here. When you
-- add a migration, apply it to prod AND reflect the end state here.
-- Last reconciled with prod: 2026-09-10 (columns + constraints + indexes dump).
--
-- Value-range validation (calorie/macro/age/weight bounds) lives ONLY in the
-- client (lib/calculations.ts inputs, form guards) — there are deliberately no
-- DB CHECK constraints for it in prod. Do not assume the DB enforces ranges.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  age INTEGER NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  goal TEXT NOT NULL CHECK (goal IN ('lose', 'maintain', 'gain')),
  activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  daily_calorie_target INTEGER NOT NULL,
  daily_water_goal INTEGER NOT NULL DEFAULT 2000,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'bg')),
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS food_entries (
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

CREATE TABLE IF NOT EXISTS activity_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  calories_burned INTEGER NOT NULL,
  duration_minutes INTEGER
    CHECK (duration_minutes IS NULL OR (duration_minutes >= 0 AND duration_minutes <= 1440)),
  ai_confidence DECIMAL(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_foods (
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

CREATE TABLE IF NOT EXISTS favorite_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  calories_burned INTEGER NOT NULL,
  duration_minutes INTEGER,
  use_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- prod carries BOTH of these (historical); the case-insensitive one is what
  -- the app relies on via .ilike('name', ...) dedup.
  CONSTRAINT favorite_activities_user_id_name_key UNIQUE (user_id, name)
);

-- Case-insensitive uniqueness on favorites (prod: *_user_name_unique).
CREATE UNIQUE INDEX IF NOT EXISTS favorite_foods_user_name_unique
  ON favorite_foods (user_id, lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS favorite_activities_user_name_unique
  ON favorite_activities (user_id, lower(name));

-- =============================================
-- Row Level Security — every table: owner-only
-- =============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their food entries" ON food_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their activity entries" ON activity_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their water entries" ON water_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their favorite foods" ON favorite_foods FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their favorite activities" ON favorite_activities FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_entries_user_date ON activity_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_entries_user_date ON water_entries(user_id, date);
-- favorites are read ordered by use_count DESC (Quick Add / Quick Log lists).
CREATE INDEX IF NOT EXISTS idx_favorite_foods_user_count ON favorite_foods(user_id, use_count DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_activities_user_count ON favorite_activities(user_id, use_count DESC);

-- =============================================
-- updated_at auto-update triggers
-- (prod: user_profiles / food_entries / activity_entries only — not water/favorites)
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
-- Storage: 'avatars' bucket (public read, owner-write under <uid>/ prefix).
-- The bucket is created outside SQL (dashboard / API); these are its policies.
-- =============================================

CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users manage their own avatar"
  ON storage.objects FOR ALL
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
