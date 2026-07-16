-- The avatars bucket was created with no server-side file_size_limit or
-- allowed_mime_types, so the 5MB/jpeg-png-webp checks in AccountSettings.tsx
-- were client-side only and trivially bypassable via a direct Storage API
-- call with a valid session token. Since the bucket is public, an
-- authenticated user could otherwise host arbitrary content (including
-- HTML) under the app's own storage domain. Enforce the same limits
-- server-side; RLS policies already scope writes to the caller's own
-- auth.uid() folder and are unaffected by this change.
update storage.buckets
set file_size_limit = 5242880, -- 5 MiB, matches MAX_AVATAR_BYTES in AccountSettings.tsx
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';
