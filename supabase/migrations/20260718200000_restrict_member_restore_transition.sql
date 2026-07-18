-- mutate_member_status's comment claims restoring to "active" is only
-- reachable from "suspended", but the guard only excluded 'revoked' sources
-- and same-status no-ops -- so a direct PATCH /api/admin/members/[id] call
-- (bypassing the console UI, which already gates the "Restore access" button
-- on status === "suspended") could flip an "invited" member straight to
-- "active", skipping activate_invited_member's reconciliation of the linked
-- access_requests row. Tighten the guard to match the stated invariant.

create or replace function public.mutate_member_status(
  p_member_id uuid,
  p_admin_id uuid,
  p_status text,
  p_now timestamptz
) returns table (
  outcome text,
  user_id uuid,
  email text,
  status text,
  access_request_id uuid,
  approved_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_member public.app_members%rowtype;
begin
  if p_admin_id is null
     or p_member_id is null
     or p_now is null
     or p_status is null
     or p_status not in ('active', 'suspended', 'revoked') then
    raise exception using errcode = '22023', message = 'unsupported member status';
  end if;

  select member.*
  into current_member
  from public.app_members as member
  where member.user_id = p_member_id
  for update;

  if not found then
    return query select
      'not_found'::text,
      null::uuid,
      null::text,
      null::text,
      null::uuid,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz;
    return;
  end if;

  if current_member.status = 'revoked'
     or current_member.status = p_status
     or (p_status = 'active' and current_member.status <> 'suspended') then
    return query select
      'conflict'::text,
      current_member.user_id,
      current_member.email,
      current_member.status,
      current_member.access_request_id,
      current_member.approved_at,
      current_member.activated_at,
      current_member.created_at;
    return;
  end if;

  update public.app_members as member
  set status = p_status
  where member.user_id = p_member_id
  returning member.* into current_member;

  insert into public.admin_audit_log (
    action,
    result_code,
    actor_user_id,
    member_user_id,
    created_at
  ) values (
    case p_status when 'suspended' then 'suspend' when 'revoked' then 'revoke' else 'restore' end,
    upper(p_status),
    p_admin_id,
    p_member_id,
    p_now
  );

  return query select
    'updated'::text,
    current_member.user_id,
    current_member.email,
    current_member.status,
    current_member.access_request_id,
    current_member.approved_at,
    current_member.activated_at,
    current_member.created_at;
end;
$$;
