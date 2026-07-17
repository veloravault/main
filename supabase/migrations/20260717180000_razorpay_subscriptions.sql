-- Real recurring billing via Razorpay Subscriptions, replacing the mock
-- upgrade button. The webhook handler is the sole authority that ever sets
-- app_members.plan for a paid tier; this migration only adds tracking tables
-- and removes the mock RPC.

-- 1. Subscription tracking -----------------------------------------------------

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  razorpay_subscription_id text unique not null,
  razorpay_customer_id text not null,
  plan text not null check (plan in ('plus', 'family')),
  period text not null check (period in ('monthly', 'yearly')),
  status text not null check (status in ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed')),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id, created_at desc);

alter table public.subscriptions enable row level security;

revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;

drop policy if exists "Users read their own subscriptions" on public.subscriptions;
create policy "Users read their own subscriptions"
on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

-- 2. Webhook audit + idempotency ----------------------------------------------

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  razorpay_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.payment_events enable row level security;

revoke all on public.payment_events from anon, authenticated;
grant select, insert on public.payment_events to service_role;
grant usage, select on sequence public.payment_events_id_seq to service_role;

-- 3. Drop the mock upgrade path ------------------------------------------------

drop function if exists public.mock_set_plan(text);
