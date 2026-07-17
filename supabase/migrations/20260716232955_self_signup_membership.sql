-- Open self-serve signup: provision an app_members row for users who sign up
-- directly (no admin-approved access_requests row exists for them), and make
-- activate_invited_member tolerate that case instead of hard-failing.
--
-- Additive only. Does not touch access_requests, admin_audit_log,
-- access_request_rate_limits, or any of the invite-only RPCs, which stay in
-- place unused. Does not change any RLS policy.

create or replace function public.provision_self_signup_member(
  p_user_id uuid,
  p_email text,
  p_now timestamptz
) returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  member_status text;
begin
  if p_email is null or p_email <> lower(btrim(p_email)) then
    raise exception using errcode = '22023', message = 'email must be canonical';
  end if;

  insert into public.app_members (user_id, email, status, approved_at)
  values (p_user_id, p_email, 'invited', p_now)
  on conflict (user_id) do nothing;

  select member.status into member_status
  from public.app_members as member
  where member.user_id = p_user_id;

  if not found then
    raise exception using errcode = '23505', message = 'self-signup membership conflicts with an existing identity';
  end if;

  return member_status;
end;
$$;

revoke all on function public.provision_self_signup_member(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.provision_self_signup_member(uuid, text, timestamptz) to service_role;

-- Redefine activate_invited_member (same signature as the original in
-- 20260715214337_initial_schema.sql) to add a branch for members with no
-- linked access_requests row. The invite-linked branch below is unchanged.
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
    -- Self-signup member: nothing to reconcile against access_requests.
    if member_status = 'active' then
      return 'active';
    end if;
    if member_status <> 'invited' then
      raise exception using errcode = 'P0002', message = 'invitation state is not activatable';
    end if;

    update public.app_members as member
    set status = 'active',
        activated_at = coalesce(member.activated_at, p_now)
    where member.user_id = p_user_id
      and member.status = 'invited';

    return 'active';
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
