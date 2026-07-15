
-- Source: supabase_schema.sql

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

-- Source: documents_schema.sql

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

-- Source: notes_schema.sql

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

-- Source: vault_update_schema.sql

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

-- Source: vault_favorites_migration.sql

-- Add is_favorite column to vault_items table
ALTER TABLE vault_items
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Source: invite_access_schema.sql

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  status text not null default 'pending' check (status in ('pending','inviting','invited','invite_failed','active')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  invite_started_at timestamptz,
  invited_at timestamptz,
  activated_at timestamptz,
  auth_user_id uuid references auth.users(id) on delete set null,
  invite_attempts integer not null default 0 check (invite_attempts >= 0),
  last_error_code text
);
create index if not exists access_requests_pending_idx on public.access_requests (requested_at desc, id desc) where status in ('pending', 'invite_failed');
create index if not exists access_requests_inviting_idx on public.access_requests (invite_started_at, id) where status = 'inviting';

create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(email)),
  status text not null check (status in ('invited','active','suspended','revoked')),
  access_request_id uuid unique references public.access_requests(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_members_access_request_idx on public.app_members (access_request_id) where access_request_id is not null;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  access_request_id uuid references public.access_requests(id) on delete set null,
  member_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  result_code text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_actor_created_idx on public.admin_audit_log (actor_user_id, created_at desc);
create index if not exists admin_audit_request_created_idx on public.admin_audit_log (access_request_id, created_at desc);

create table if not exists public.access_request_rate_limits (
  fingerprint text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (fingerprint, window_started_at)
);

create or replace function public.consume_access_request_rate_limit(
  p_fingerprint text,
  p_window_started_at timestamptz,
  p_limit integer
) returns boolean
language sql
security invoker
set search_path = ''
as $$
  insert into public.access_request_rate_limits (fingerprint, window_started_at, request_count)
  values (p_fingerprint, p_window_started_at, 1)
  on conflict (fingerprint, window_started_at)
  do update set request_count = public.access_request_rate_limits.request_count + 1
  returning request_count <= p_limit;
$$;

create or replace function public.claim_access_request_invitation(
  p_request_id uuid,
  p_admin_id uuid,
  p_now timestamptz,
  p_stale_before timestamptz
) returns table (id uuid, email text, full_name text, attempt integer)
language sql
security invoker
set search_path = ''
as $$
  update public.access_requests as request
  set status = 'inviting',
      invite_started_at = p_now,
      reviewed_at = coalesce(request.reviewed_at, p_now),
      reviewed_by = p_admin_id,
      invite_attempts = request.invite_attempts + 1,
      last_error_code = null,
      updated_at = p_now
  where request.id = p_request_id
    and (
      request.status in ('pending', 'invite_failed')
      or (
        request.status = 'inviting'
        and request.invite_started_at < p_stale_before
      )
    )
  returning request.id, request.email, request.full_name, request.invite_attempts;
$$;

create or replace function public.complete_access_request_invitation(
  p_request_id uuid,
  p_admin_id uuid,
  p_user_id uuid,
  p_attempt integer,
  p_now timestamptz
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_email text;
begin
  select request.email
  into request_email
  from public.access_requests as request
  where request.id = p_request_id
    and request.status = 'inviting'
    and request.invite_attempts = p_attempt
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'invitation request is not claimable';
  end if;

  insert into public.app_members as member (
    user_id,
    email,
    status,
    access_request_id,
    approved_by,
    approved_at
  ) values (
    p_user_id,
    request_email,
    'invited',
    p_request_id,
    p_admin_id,
    p_now
  )
  on conflict (user_id) do update
  set email = excluded.email,
      access_request_id = coalesce(member.access_request_id, excluded.access_request_id),
      approved_by = coalesce(member.approved_by, excluded.approved_by);

  update public.access_requests as request
  set status = 'invited',
      auth_user_id = p_user_id,
      invited_at = p_now,
      last_error_code = null,
      updated_at = p_now
  where request.id = p_request_id
    and request.invite_attempts = p_attempt;
end;
$$;

create or replace function public.reconcile_confirmed_invite(
  p_user_id uuid,
  p_email text,
  p_now timestamptz
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  matching_request public.access_requests%rowtype;
  member_status text;
begin
  if p_email is null or p_email <> lower(btrim(p_email)) then
    raise exception using errcode = '22023', message = 'email must be canonical';
  end if;

  select request.*
  into matching_request
  from public.access_requests as request
  where request.email = p_email
    and request.status in ('inviting', 'invited', 'invite_failed')
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'eligible invitation request not found';
  end if;

  insert into public.app_members (
    user_id,
    email,
    status,
    access_request_id,
    approved_by,
    approved_at
  ) values (
    p_user_id,
    p_email,
    'invited',
    matching_request.id,
    matching_request.reviewed_by,
    coalesce(matching_request.reviewed_at, p_now)
  )
  on conflict do nothing;

  update public.app_members as member
  set email = p_email,
      access_request_id = coalesce(member.access_request_id, matching_request.id),
      approved_by = coalesce(member.approved_by, matching_request.reviewed_by)
  where member.user_id = p_user_id;

  update public.app_members as member
  set status = 'invited'
  where member.user_id = p_user_id
    and member.status not in ('active', 'suspended', 'revoked');

  select member.status
  into member_status
  from public.app_members as member
  where member.user_id = p_user_id;

  if not found then
    raise exception using errcode = '23505', message = 'invitation membership conflicts with an existing identity';
  end if;

  update public.access_requests as request
  set status = 'invited',
      auth_user_id = p_user_id,
      invited_at = coalesce(request.invited_at, p_now),
      last_error_code = null,
      updated_at = p_now
  where request.id = matching_request.id;

  return member_status;
end;
$$;

create or replace function public.activate_invited_member(
  p_user_id uuid,
  p_now timestamptz
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_id uuid;
  member_status text;
  request_status text;
  request_user_id uuid;
begin
  select member.status, member.access_request_id
  into member_status, request_id
  from public.app_members as member
  where member.user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'membership not found';
  end if;

  if request_id is null then
    raise exception using errcode = 'P0002', message = 'invitation request link not found';
  end if;

  select request.status, request.auth_user_id
  into request_status, request_user_id
  from public.access_requests as request
  where request.id = request_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'invitation request not found';
  end if;

  if member_status = 'active' then
    if request_status = 'active' and request_user_id = p_user_id then
      return 'active';
    end if;
    raise exception using errcode = 'P0002', message = 'active invitation state is inconsistent';
  end if;

  if member_status <> 'invited'
     or request_status <> 'invited'
     or request_user_id is distinct from p_user_id then
    raise exception using errcode = 'P0002', message = 'invitation state is not activatable';
  end if;

  update public.app_members as member
  set status = 'active',
      activated_at = coalesce(member.activated_at, p_now)
  where member.user_id = p_user_id
    and member.status = 'invited';

  update public.access_requests as request
  set status = 'active',
      activated_at = coalesce(request.activated_at, p_now),
      updated_at = p_now
  where request.id = request_id
    and request.auth_user_id = p_user_id
    and request.status = 'invited';

  return 'active';
end;
$$;

create or replace function public.mutate_member_status(
  p_member_id uuid,
  p_admin_id uuid,
  p_status text,
  p_now timestamptz
) returns table (
  outcome text,
  user_id uuid,
  email text,
  status text,
  access_request_id uuid,
  approved_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_member public.app_members%rowtype;
begin
  if p_admin_id is null
     or p_member_id is null
     or p_now is null
     or p_status is null
     or p_status not in ('suspended', 'revoked') then
    raise exception using errcode = '22023', message = 'unsupported member status';
  end if;

  select member.*
  into current_member
  from public.app_members as member
  where member.user_id = p_member_id
  for update;

  if not found then
    return query select
      'not_found'::text,
      null::uuid,
      null::text,
      null::text,
      null::uuid,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz;
    return;
  end if;

  if current_member.status = 'revoked'
     or (current_member.status = 'suspended' and p_status = 'suspended') then
    return query select
      'conflict'::text,
      current_member.user_id,
      current_member.email,
      current_member.status,
      current_member.access_request_id,
      current_member.approved_at,
      current_member.activated_at,
      current_member.created_at;
    return;
  end if;

  update public.app_members as member
  set status = p_status
  where member.user_id = p_member_id
  returning member.* into current_member;

  insert into public.admin_audit_log (
    action,
    result_code,
    actor_user_id,
    member_user_id,
    created_at
  ) values (
    case p_status when 'suspended' then 'suspend' else 'revoke' end,
    upper(p_status),
    p_admin_id,
    p_member_id,
    p_now
  );

  return query select
    'updated'::text,
    current_member.user_id,
    current_member.email,
    current_member.status,
    current_member.access_request_id,
    current_member.approved_at,
    current_member.activated_at,
    current_member.created_at;
end;
$$;

alter table public.access_requests enable row level security;
alter table public.app_members enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.access_request_rate_limits enable row level security;
alter table public.vault_items enable row level security;
alter table public.vault_documents enable row level security;
alter table public.secure_notes enable row level security;
alter table public.secure_wallet enable row level security;

revoke all on public.access_requests, public.app_members, public.admin_audit_log, public.access_request_rate_limits from anon, authenticated;
grant select on public.app_members to authenticated;
grant select, insert, update, delete on public.access_requests, public.app_members, public.admin_audit_log, public.access_request_rate_limits to service_role;
grant usage, select on sequence public.admin_audit_log_id_seq to service_role;
revoke all on function public.consume_access_request_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_access_request_rate_limit(text, timestamptz, integer) to service_role;
revoke all on function public.claim_access_request_invitation(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_access_request_invitation(uuid, uuid, timestamptz, timestamptz) to service_role;
revoke all on function public.complete_access_request_invitation(uuid, uuid, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.complete_access_request_invitation(uuid, uuid, uuid, integer, timestamptz) to service_role;
revoke all on function public.reconcile_confirmed_invite(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.reconcile_confirmed_invite(uuid, text, timestamptz) to service_role;
revoke all on function public.activate_invited_member(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.activate_invited_member(uuid, timestamptz) to service_role;
revoke all on function public.mutate_member_status(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.mutate_member_status(uuid, uuid, text, timestamptz) to service_role;

drop policy if exists "Members read their own status" on public.app_members;
create policy "Members read their own status" on public.app_members
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own vault items" on public.vault_items;
create policy "Users can view their own vault items"
on public.vault_items for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can insert their own vault items" on public.vault_items;
create policy "Users can insert their own vault items"
on public.vault_items for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can update their own vault items" on public.vault_items;
create policy "Users can update their own vault items"
on public.vault_items for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can delete their own vault items" on public.vault_items;
create policy "Users can delete their own vault items"
on public.vault_items for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can view their own documents" on public.vault_documents;
create policy "Users can view their own documents"
on public.vault_documents for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can insert their own documents" on public.vault_documents;
create policy "Users can insert their own documents"
on public.vault_documents for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can update their own documents" on public.vault_documents;
create policy "Users can update their own documents"
on public.vault_documents for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can delete their own documents" on public.vault_documents;
create policy "Users can delete their own documents"
on public.vault_documents for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can view their own secure notes" on public.secure_notes;
create policy "Users can view their own secure notes"
on public.secure_notes for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can insert their own secure notes" on public.secure_notes;
create policy "Users can insert their own secure notes"
on public.secure_notes for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can update their own secure notes" on public.secure_notes;
create policy "Users can update their own secure notes"
on public.secure_notes for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can delete their own secure notes" on public.secure_notes;
create policy "Users can delete their own secure notes"
on public.secure_notes for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can view own wallet items" on public.secure_wallet;
drop policy if exists "Users can insert own wallet items" on public.secure_wallet;
drop policy if exists "Users can update own wallet items" on public.secure_wallet;
drop policy if exists "Users can delete own wallet items" on public.secure_wallet;

drop policy if exists "Users can view their own wallet items" on public.secure_wallet;
create policy "Users can view their own wallet items"
on public.secure_wallet for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can insert their own wallet items" on public.secure_wallet;
create policy "Users can insert their own wallet items"
on public.secure_wallet for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can update their own wallet items" on public.secure_wallet;
create policy "Users can update their own wallet items"
on public.secure_wallet for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can delete their own wallet items" on public.secure_wallet;
create policy "Users can delete their own wallet items"
on public.secure_wallet for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Avatar images are publicly accessible" on storage.objects;

drop policy if exists "Users can read their own documents" on storage.objects;
drop policy if exists "Users can upload their own documents" on storage.objects;
drop policy if exists "Users can update their own documents" on storage.objects;
drop policy if exists "Users can delete their own documents" on storage.objects;

drop policy if exists "Users can read their own document files" on storage.objects;
create policy "Users can read their own document files"
on storage.objects for select to authenticated
using (
  bucket_id = 'vault_documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can upload their own document files" on storage.objects;
create policy "Users can upload their own document files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vault_documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can update their own document files" on storage.objects;
create policy "Users can update their own document files"
on storage.objects for update to authenticated
using (
  bucket_id = 'vault_documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
)
with check (
  bucket_id = 'vault_documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can delete their own document files" on storage.objects;
create policy "Users can delete their own document files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'vault_documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can upload their own avatars" on storage.objects;
create policy "Users can upload their own avatars"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can update their own avatars" on storage.objects;
create policy "Users can update their own avatars"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

drop policy if exists "Users can delete their own avatars" on storage.objects;
create policy "Users can delete their own avatars"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

insert into public.app_members (user_id, email, status, activated_at)
select existing_user.user_id, lower(existing_user.email), 'active', now()
from (
  select auth_user.id as user_id, auth_user.email
  from auth.users auth_user
  where auth_user.email_confirmed_at is not null
    and auth_user.email is not null
    and (
      exists (select 1 from public.vault_items item where item.user_id = auth_user.id)
      or exists (select 1 from public.vault_documents document where document.user_id = auth_user.id)
      or exists (select 1 from public.secure_notes note where note.user_id = auth_user.id)
      or exists (select 1 from public.secure_wallet wallet where wallet.user_id = auth_user.id)
    )
) existing_user
on conflict (user_id) do nothing;

-- Source: security_hardening.sql

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
