-- Close check-then-insert races in the plan-limit enforcement functions.
--
-- try_consume_ai_credit / enforce_document_quota / enforce_wallet_quota each do
-- a SELECT count/sum followed by an INSERT. Under concurrency (e.g. a Free user
-- firing several /api/scan requests at once), every transaction reads a count
-- below the limit before any of them commits, so all of them are allowed —
-- letting a Free user exceed the monthly AI allowance (each excess call is a
-- paid Gemini request), the wallet record cap, or the document byte cap.
--
-- Fix: take a per-user transaction-scoped advisory lock before the count so
-- concurrent operations for the same user serialize. The lock is released
-- automatically at commit/rollback. It's keyed on the user id, so different
-- users never contend. CREATE OR REPLACE keeps existing grants and the existing
-- trigger bindings, so no re-grant or trigger recreation is needed.

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
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));

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
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));

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
