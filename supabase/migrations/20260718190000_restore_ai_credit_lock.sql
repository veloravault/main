-- 20260718180000_meter_global_import.sql replaced try_consume_ai_credit to add
-- the 'import' kind, but its CREATE OR REPLACE body was copied from before
-- 20260717190000_serialize_plan_limit_checks.sql added the per-user advisory
-- lock — silently dropping the fix for the check-then-insert race described
-- there. Restore the lock on the current (import-aware) function body.

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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

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
