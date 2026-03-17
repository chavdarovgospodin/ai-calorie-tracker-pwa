-- Add daily water goal to user profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS daily_water_goal INTEGER NOT NULL DEFAULT 2000;

-- Create water entries table
CREATE TABLE IF NOT EXISTS water_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE water_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their water entries"
  ON water_entries FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_water_entries_user_date
  ON water_entries(user_id, date);
