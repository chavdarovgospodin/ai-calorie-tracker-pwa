ALTER TABLE favorite_activities
  ADD CONSTRAINT IF NOT EXISTS favorite_activities_user_id_name_key
  UNIQUE (user_id, name);
