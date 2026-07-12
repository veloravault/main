-- 1. Add Category and Domain to vault_items
ALTER TABLE vault_items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized',
ADD COLUMN IF NOT EXISTS domain TEXT;

ALTER TABLE vault_items
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own vault items" ON vault_items;
CREATE POLICY "Users can update their own vault items"
ON vault_items FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

ALTER TABLE vault_documents
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Uncategorized';

CREATE TABLE IF NOT EXISTS secure_wallet (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit_card', 'bank_account')),
    encrypted_content TEXT NOT NULL,
    iv TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE secure_wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet items" ON secure_wallet;
CREATE POLICY "Users can view their own wallet items"
ON secure_wallet FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet items" ON secure_wallet;
CREATE POLICY "Users can insert their own wallet items"
ON secure_wallet FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own wallet items" ON secure_wallet;
CREATE POLICY "Users can update their own wallet items"
ON secure_wallet FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own wallet items" ON secure_wallet;
CREATE POLICY "Users can delete their own wallet items"
ON secure_wallet FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- 2. Create the Avatars Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies for Avatars
-- Allow public access to read avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
