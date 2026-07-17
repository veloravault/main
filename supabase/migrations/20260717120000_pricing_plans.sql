-- Pricing plan enforcement: Free / Plus / Family tiers.
--
-- Adds a `plan` to app_members, document byte accounting, monthly AI usage
-- tracking, and DB-level enforcement (triggers + RPCs) so the limits cannot be
-- bypassed by a crafted client. Limits mirror src/lib/plans.ts:
--   free:   documents 0 bytes,  wallet 3,        AI 5/month
--   plus:   documents 5 GiB,    wallet unlimited, AI unlimited
--   family: documents 5 GiB,    wallet unlimited, AI unlimited
-- 5 GiB = 5 * 1024^3 = 5368709120 bytes.

-- 1. Plan column on membership -------------------------------------------------

alter table public.app_members
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'plus', 'family'));

-- 2. Document size accounting --------------------------------------------------

alter table public.vault_documents
  add column if not exists size_bytes bigint not null default 0
  check (size_bytes >= 0);

-- 3. AI usage event log --------------------------------------------------------

create table if not exists public.ai_usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('scan', 'document_name', 'categorize')),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
  on public.ai_usage_events (user_id, created_at desc);

alter table public.ai_usage_events enable row level security;

revoke all on public.ai_usage_events from anon, authenticated;
grant select on public.ai_usage_events to authenticated;
grant select, insert on public.ai_usage_events to service_role;
grant usage, select on sequence public.ai_usage_events_id_seq to service_role;

drop policy if exists "Users read their own AI usage" on public.ai_usage_events;
create policy "Users read their own AI usage"
on public.ai_usage_events for select to authenticated
using ((select auth.uid()) = user_id);

-- 4. Shared limit helpers ------------------------------------------------------

create or replace function public.plan_document_bytes(p_plan text)
returns bigint language sql immutable set search_path = '' as $$
  select case p_plan when 'free' then 0::bigint else 5368709120::bigint end;
$$;

create or replace function public.plan_wallet_records(p_plan text)
returns integer language sql immutable set search_path = '' as $$
  select case p_plan when 'free' then 3 else null end;
$$;

create or replace function public.plan_ai_per_month(p_plan text)
returns integer language sql immutable set search_path = '' as $$
  select case p_plan when 'free' then 5 else null end;
$$;

-- 5. AI credit consumption (server-only) --------------------------------------
-- Returns true if the user may perform one AI op (and records it), false if the
-- free monthly allowance is exhausted. Paid plans always return true.

create or replace function public.try_consume_ai_credit(p_user_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_plan text;
  monthly_limit integer;
  used integer;
begin
  if p_kind not in ('scan', 'document_name', 'categorize') then
    raise exception using errcode = '22023', message = 'invalid ai usage kind';
  end if;

  select member.plan into user_plan
  from public.app_members as member
  where member.user_id = p_user_id
    and member.status = 'active';

  if not found then
    return false;
  end if;

  monthly_limit := public.plan_ai_per_month(user_plan);

  if monthly_limit is null then
    -- Unlimited plan: still log the event for usage display, then allow.
    insert into public.ai_usage_events (user_id, kind) values (p_user_id, p_kind);
    return true;
  end if;

  select count(*) into used
  from public.ai_usage_events as event
  where event.user_id = p_user_id
    and event.created_at >= date_trunc('month', now());

  if used >= monthly_limit then
    return false;
  end if;

  insert into public.ai_usage_events (user_id, kind) values (p_user_id, p_kind);
  return true;
end;
$$;

revoke all on function public.try_consume_ai_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.try_consume_ai_credit(uuid, text) to service_role;

-- 6. Account usage snapshot (client-facing) -----------------------------------

create or replace function public.get_account_usage()
returns table (
  plan text,
  storage_bytes bigint,
  storage_limit bigint,
  ai_used integer,
  ai_limit integer,
  wallet_count integer,
  wallet_limit integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  user_plan text;
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'not authenticated';
  end if;

  select member.plan into user_plan
  from public.app_members as member
  where member.user_id = caller
    and member.status = 'active';

  if not found then
    raise exception using errcode = '42501', message = 'no active membership';
  end if;

  return query
  select
    user_plan,
    coalesce((select sum(document.size_bytes) from public.vault_documents document where document.user_id = caller), 0)::bigint,
    public.plan_document_bytes(user_plan),
    coalesce((select count(*) from public.ai_usage_events event where event.user_id = caller and event.created_at >= date_trunc('month', now())), 0)::integer,
    public.plan_ai_per_month(user_plan),
    coalesce((select count(*) from public.secure_wallet wallet where wallet.user_id = caller), 0)::integer,
    public.plan_wallet_records(user_plan);
end;
$$;

revoke all on function public.get_account_usage() from public, anon;
grant execute on function public.get_account_usage() to authenticated;

-- 7. Mock plan switch (placeholder for Razorpay) ------------------------------
-- Lets the signed-in user set their own plan with no payment. Replace with a
-- payment-verified path once Razorpay checkout is wired up.

create or replace function public.mock_set_plan(p_plan text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'not authenticated';
  end if;
  if p_plan not in ('free', 'plus', 'family') then
    raise exception using errcode = '22023', message = 'invalid plan';
  end if;

  update public.app_members as member
  set plan = p_plan
  where member.user_id = caller
    and member.status = 'active';

  if not found then
    raise exception using errcode = '42501', message = 'no active membership';
  end if;

  return p_plan;
end;
$$;

revoke all on function public.mock_set_plan(text) from public, anon;
grant execute on function public.mock_set_plan(text) to authenticated;

-- 8. Document storage quota enforcement (trigger) -----------------------------

create or replace function public.enforce_document_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_plan text;
  byte_limit bigint;
  used bigint;
begin
  select member.plan into user_plan
  from public.app_members as member
  where member.user_id = new.user_id
    and member.status = 'active';

  if not found then
    raise exception using errcode = '42501', message = 'no active membership';
  end if;

  byte_limit := public.plan_document_bytes(user_plan);

  if byte_limit = 0 then
    raise exception using
      errcode = '23514',
      message = 'Documents are not included on the Free plan. Upgrade to Plus to store documents.';
  end if;

  select coalesce(sum(document.size_bytes), 0) into used
  from public.vault_documents as document
  where document.user_id = new.user_id;

  if used + new.size_bytes > byte_limit then
    raise exception using
      errcode = '23514',
      message = 'Storage limit reached. Free up space or upgrade your plan.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_document_quota_trigger on public.vault_documents;
create trigger enforce_document_quota_trigger
  before insert on public.vault_documents
  for each row execute function public.enforce_document_quota();

-- 9. Wallet record limit enforcement (trigger) --------------------------------

create or replace function public.enforce_wallet_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_plan text;
  record_limit integer;
  used integer;
begin
  select member.plan into user_plan
  from public.app_members as member
  where member.user_id = new.user_id
    and member.status = 'active';

  if not found then
    raise exception using errcode = '42501', message = 'no active membership';
  end if;

  record_limit := public.plan_wallet_records(user_plan);

  if record_limit is null then
    return new;
  end if;

  select count(*) into used
  from public.secure_wallet as wallet
  where wallet.user_id = new.user_id;

  if used >= record_limit then
    raise exception using
      errcode = '23514',
      message = 'Wallet record limit reached on the Free plan. Upgrade to Plus for unlimited records.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_wallet_quota_trigger on public.secure_wallet;
create trigger enforce_wallet_quota_trigger
  before insert on public.secure_wallet
  for each row execute function public.enforce_wallet_quota();
