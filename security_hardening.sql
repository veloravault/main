-- WARNING: fresh-install script only. If invite_access_schema.sql has
-- already been applied to this project, do NOT re-run this file — its
-- storage/RLS policies are superseded by supabase/migrations/. Re-running
-- against an already-migrated database will fail on existing-policy/
-- existing-table conflicts rather than silently applying; never run only
-- part of this file to "patch" a live project.
-- Run once in the Supabase SQL editor after the base schema migrations.
-- Tightens avatar ownership policies without changing public avatar reads.

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (select auth.uid())::text = (storage.foldername(name))[1]
);
