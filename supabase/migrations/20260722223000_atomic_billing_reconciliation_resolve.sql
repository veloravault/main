-- resolveBillingReconciliationIssueAdmin previously read the issue, checked
-- status in application code, then ran two separate updates (subscriptions,
-- then billing_reconciliation_issues) with no lock between them. Two
-- concurrent resolves (a double-click, or two admin tabs) could both pass
-- the pending check and both write a "resolved" audit entry for the same
-- event. Separately, the corrective subscriptions update was only checked
-- for a query error, never for whether it actually matched a row - so an
-- issue could be marked resolved even when nothing was actually fixed.
--
-- This wraps the whole thing in one function: lock the issue row, reject if
-- it's already resolved (or missing), apply the two known intended_update
-- shapes (cancel_at_cycle_end / scheduled_period) explicitly rather than
-- via dynamic SQL, and only mark it resolved if that update actually
-- matched the target subscription. Any failure rolls the whole thing back,
-- so "resolved" now always means the fix actually landed.

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
  where public.subscriptions.razorpay_subscription_id = v_issue.razorpay_subscription_id;

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND' using errcode = 'P0003';
  end if;

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
