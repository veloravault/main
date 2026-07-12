-- Add is_favorite column to vault_items table
ALTER TABLE vault_items 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
