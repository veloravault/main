-- resolve_billing_reconciliation_issue applied its captured intended_update
-- to public.subscriptions unconditionally, with no freshness check - unlike
-- the Razorpay webhook handler, which guards every subscriptions write with
-- `last_razorpay_event_at is null or last_razorpay_event_at <= this event`
-- specifically so an out-of-order/delayed event can never stomp newer state.
--
-- A reconciliation issue can go stale the same way: it's queued when a local
-- write fails after Razorpay already succeeded, but the desync can self-heal
-- before the owner gets to it (e.g. the subscription renews normally and the
-- webhook correctly applies the real, current state). If the owner then
-- retries the stale issue, the old captured intended_update was being
-- reapplied over the already-correct, newer data - with nothing to ever fix
-- it again afterward.
--
-- This adds the same freshness guard to the corrective update. If a newer
-- Razorpay event already landed since the issue was queued, the desync has
-- already self-healed - the corrective write is skipped and the issue is
-- still marked resolved (closing it is still correct; there's just nothing
-- left to fix). The "subscription row doesn't exist at all" error case is
-- now checked separately so it isn't confused with "found but fresher".

create or replace function public.resolve_billing_reconciliation_issue(
  p_issue_id uuid,
  p_admin_id uuid
)
returns table (
  id uuid,
  user_id uuid,
  razorpay_subscription_id text,
  action text,
  intended_update jsonb,
  error_message text,
  status text,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_issue public.billing_reconciliation_issues%rowtype;
  v_subscription_exists boolean;
begin
  select * into v_issue
  from public.billing_reconciliation_issues
  where public.billing_reconciliation_issues.id = p_issue_id
  for update;

  if not found then
    raise exception 'ISSUE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_issue.status = 'resolved' then
    raise exception 'ISSUE_ALREADY_RESOLVED' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.subscriptions
    where public.subscriptions.razorpay_subscription_id = v_issue.razorpay_subscription_id
  ) into v_subscription_exists;

  if not v_subscription_exists then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0003';
  end if;

  update public.subscriptions
  set
    cancel_at_cycle_end = coalesce(
      (v_issue.intended_update->>'cancel_at_cycle_end')::boolean,
      public.subscriptions.cancel_at_cycle_end
    ),
    scheduled_period = case
      when v_issue.intended_update ? 'scheduled_period' then v_issue.intended_update->>'scheduled_period'
      else public.subscriptions.scheduled_period
    end,
    updated_at = now()
  where public.subscriptions.razorpay_subscription_id = v_issue.razorpay_subscription_id
    and (
      public.subscriptions.last_razorpay_event_at is null
      or public.subscriptions.last_razorpay_event_at <= v_issue.created_at
    );

  update public.billing_reconciliation_issues
  set status = 'resolved', resolved_at = now(), resolved_by = p_admin_id
  where public.billing_reconciliation_issues.id = p_issue_id;

  insert into public.admin_audit_log (actor_user_id, member_user_id, action, result_code)
  values (p_admin_id, v_issue.user_id, 'billing_reconciliation_resolve', 'RESOLVED');

  return query
  select bri.id, bri.user_id, bri.razorpay_subscription_id, bri.action, bri.intended_update,
         bri.error_message, bri.status, bri.created_at, bri.resolved_at
  from public.billing_reconciliation_issues bri
  where bri.id = p_issue_id;
end;
$$;

revoke all on function public.resolve_billing_reconciliation_issue(uuid, uuid) from public, anon, authenticated;
grant execute on function public.resolve_billing_reconciliation_issue(uuid, uuid) to service_role;
