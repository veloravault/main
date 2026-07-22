-- WARNING: fresh-install script only. If invite_access_schema.sql has
-- already been applied to this project, do NOT re-run this file - its
-- storage/RLS policies are superseded by supabase/migrations/. Re-running
-- against an already-migrated database will fail on existing-policy/
-- existing-table conflicts rather than silently applying; never run only
-- part of this file to "patch" a live project.
-- Run this in the Supabase SQL Editor

-- 1. Create a table for Vault Items (Passwords & Secure Notes)
CREATE TABLE IF NOT EXISTS vault_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- Stored in plain text for easy searching (e.g., "Netflix")
    encrypted_data TEXT NOT NULL, -- The encrypted password/username JSON blob
    iv TEXT NOT NULL, -- Initialization vector for decryption
    salt TEXT NOT NULL, -- Salt used for key derivation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Users can only read their own items
CREATE POLICY "Users can view their own vault items"
ON vault_items FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Users can only insert their own items
CREATE POLICY "Users can insert their own vault items"
ON vault_items FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- Users can only update their own items
CREATE POLICY "Users can update their own vault items"
ON vault_items FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Users can only delete their own items
CREATE POLICY "Users can delete their own vault items"
ON vault_items FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);
