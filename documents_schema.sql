-- WARNING: fresh-install script only. If invite_access_schema.sql has
-- already been applied to this project, do NOT re-run this file — its
-- storage/RLS policies are superseded by supabase/migrations/. Re-running
-- against an already-migrated database will fail on existing-policy/
-- existing-table conflicts rather than silently applying; never run only
-- part of this file to "patch" a live project.
-- Run this in the Supabase SQL Editor to add the documents table!

CREATE TABLE IF NOT EXISTS vault_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- The original filename
    storage_path TEXT NOT NULL, -- The path in the storage bucket
    iv TEXT NOT NULL, -- Initialization vector for decryption
    salt TEXT NOT NULL, -- Salt used for key derivation
    category TEXT DEFAULT 'Uncategorized',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
ON vault_documents FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own documents"
ON vault_documents FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own documents"
ON vault_documents FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own documents"
ON vault_documents FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('vault_documents', 'vault_documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read their own document files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'vault_documents'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own document files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'vault_documents'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own document files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'vault_documents'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
);
