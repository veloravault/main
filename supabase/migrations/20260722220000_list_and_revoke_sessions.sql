-- The "Sessions" section in Settings > Security only ever showed a single
-- fake row for the current browser (parsed from the user agent, not real
-- session data) plus a bulk "sign out other devices" action, with no real
-- visibility into what other sessions actually exist. auth.sessions is
-- GoTrue's own session store - user_agent/ip were added there specifically
-- to support building this kind of "manage your devices" UI. These two
-- functions expose it narrowly: list the caller's own sessions, and revoke
-- one specific session (never the current one - use normal sign-out for
-- that, since revoking your own live session out from under yourself here
-- would be confusing rather than useful).

create or replace function public.list_my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  refreshed_at timestamp,
  not_after timestamptz,
  user_agent text,
  is_current boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.id,
    s.created_at,
    s.refreshed_at,
    s.not_after,
    s.user_agent,
    s.id = nullif(auth.jwt()->>'session_id', '')::uuid
  from auth.sessions s
  where s.user_id = auth.uid()
  order by coalesce(s.refreshed_at, s.created_at) desc nulls last;
$$;

revoke all on function public.list_my_sessions() from public, anon, authenticated;
grant execute on function public.list_my_sessions() to authenticated;

create or replace function public.revoke_my_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_session_id uuid := nullif(auth.jwt()->>'session_id', '')::uuid;
begin
  if p_session_id = v_current_session_id then
    raise exception 'SESSION_IS_CURRENT' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from auth.sessions where id = p_session_id and user_id = auth.uid()
  ) then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Deleted explicitly rather than relying on an assumed cascade - this is
  -- correct regardless of whether auth.refresh_tokens happens to cascade
  -- from auth.sessions in the installed GoTrue version.
  delete from auth.refresh_tokens where session_id = p_session_id;
  delete from auth.sessions where id = p_session_id;
end;
$$;

revoke all on function public.revoke_my_session(uuid) from public, anon, authenticated;
grant execute on function public.revoke_my_session(uuid) to authenticated;
