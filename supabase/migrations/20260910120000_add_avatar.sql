-- Profile photo. Public URL of the uploaded avatar lives on user_profiles;
-- the file itself goes in the public 'avatars' storage bucket (created via the
-- Supabase dashboard / API — see PROJECT_CONTEXT.md, not creatable from SQL here).
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Storage RLS: bucket 'avatars' is public-read; each user may write only under
-- their own <uid>/ prefix. Run AFTER creating the bucket.
DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users manage their own avatar" ON storage.objects;
CREATE POLICY "Users manage their own avatar"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
