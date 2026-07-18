-- Razorpay's cancel/change-period APIs can succeed while the follow-up local
-- write to public.subscriptions fails (network blip, transient DB error).
-- Today that desync is only console.error'd — invisible outside logs, with
-- no way for the owner to reconcile it. This queue captures the exact patch
-- that failed to apply so an admin can retry it from the console.

create table public.billing_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  razorpay_subscription_id text not null,
  action text not null check (action in ('cancel', 'change_period')),
  intended_update jsonb not null,
  error_message text,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index billing_reconciliation_status_created_idx
  on public.billing_reconciliation_issues (status, created_at desc);

alter table public.billing_reconciliation_issues enable row level security;

revoke all on table public.billing_reconciliation_issues from public;
revoke all on table public.billing_reconciliation_issues from anon, authenticated;
grant select, insert, update on table public.billing_reconciliation_issues to service_role;
