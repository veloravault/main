-- Velora Vault now offers only Free and Plus. Preserve existing paid access by
-- mapping any legacy Family records to Plus before tightening constraints.

update public.app_members
set plan = 'plus'
where plan = 'family';

update public.subscriptions
set plan = 'plus'
where plan = 'family';

alter table public.app_members
  drop constraint if exists app_members_plan_check;

alter table public.app_members
  add constraint app_members_plan_check check (plan in ('free', 'plus'));

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan = 'plus');

alter table public.subscriptions
  add column if not exists cancel_at_cycle_end boolean not null default false;
