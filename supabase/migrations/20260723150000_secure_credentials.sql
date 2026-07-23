-- Five new vault item types (SSH keys, crypto passphrases, API credentials,
-- WiFi passwords, 2FA backup codes) share one table via a `type`
-- discriminator, mirroring the existing secure_wallet pattern
-- (credit_card/bank_account) - five near-identical "encrypted blob" shapes
-- don't warrant five separate tables, RLS policy sets, and backup/restore
-- integration points.

create table public.secure_credentials (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  type text not null check (type in ('ssh_key', 'crypto_wallet', 'api_credential', 'wifi_credential', 'two_factor_backup')),
  encrypted_content text not null,
  iv text not null,
  salt text not null,
  category text default 'Uncategorized',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.secure_credentials enable row level security;

create policy "Users can view their own credentials"
on public.secure_credentials for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

create policy "Users can insert their own credentials"
on public.secure_credentials for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

create policy "Users can update their own credentials"
on public.secure_credentials for update to authenticated
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

create policy "Users can delete their own credentials"
on public.secure_credentials for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.app_members member
    where member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

-- Keep the table available through the Data API only to signed-in users and
-- trusted server code, matching vault_items/vault_documents/secure_notes/secure_wallet.
revoke all on table
  public.secure_credentials
from anon, authenticated;

grant select, insert, update, delete on table
  public.secure_credentials
to authenticated, service_role;
