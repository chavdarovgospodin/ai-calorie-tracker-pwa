-- Add UI language preference to user profiles.
-- lib/locale-context.tsx reads/writes user_profiles.locale; the column was missing in prod,
-- so the language switcher silently failed to persist across sessions.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en'
    CHECK (locale IN ('en', 'bg'));
