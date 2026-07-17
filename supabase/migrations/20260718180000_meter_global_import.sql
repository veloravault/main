-- The "Magic Import" paste-to-extract flow (extractGlobalImportDrafts /
-- parseGlobalBulkData in src/app/actions.ts) was never wired into AI usage
-- metering — every other user-initiated AI action (image scan, document
-- auto-naming, document categorization) counts against the Free plan's
-- monthly allowance, but a Free user could call this one an unlimited
-- number of times. Add 'import' as a metered kind so it shares the same
-- monthly counter.

alter table public.ai_usage_events drop constraint if exists ai_usage_events_kind_check;
alter table public.ai_usage_events add constraint ai_usage_events_kind_check
  check (kind in ('scan', 'document_name', 'categorize', 'import'));

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
  if p_kind not in ('scan', 'document_name', 'categorize', 'import') then
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
