-- Run this in the Supabase SQL Editor

-- 1. Create a table for Secure Notes
CREATE TABLE IF NOT EXISTS secure_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- Stored in plain text for easy searching (e.g., "Diary Entry")
    encrypted_content TEXT NOT NULL, -- The encrypted markdown notes
    iv TEXT NOT NULL, -- Initialization vector for decryption
    salt TEXT NOT NULL, -- Salt used for key derivation
    category TEXT DEFAULT 'Uncategorized',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE secure_notes ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Users can only read their own notes
CREATE POLICY "Users can view their own secure notes"
ON secure_notes FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Users can only insert their own notes
CREATE POLICY "Users can insert their own secure notes"
ON secure_notes FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- Users can only update their own notes
CREATE POLICY "Users can update their own secure notes"
ON secure_notes FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Users can only delete their own notes
CREATE POLICY "Users can delete their own secure notes"
ON secure_notes FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);
