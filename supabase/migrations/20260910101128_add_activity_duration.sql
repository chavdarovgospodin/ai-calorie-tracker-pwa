-- Persist workout duration. The AI (analyze-activity) already returns
-- durationMinutes and favorite_activities.duration_minutes exists, but activity
-- entries had nowhere to store it.
ALTER TABLE activity_entries
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

ALTER TABLE activity_entries
  DROP CONSTRAINT IF EXISTS chk_activity_duration_minutes;
ALTER TABLE activity_entries
  ADD CONSTRAINT chk_activity_duration_minutes
    CHECK (duration_minutes IS NULL OR (duration_minutes >= 0 AND duration_minutes <= 1440));
