-- Two independent additions to public.subscriptions:
--
-- 1. scheduled_period: set when a signed-in user requests a billing-period
--    change (monthly <-> yearly). The change takes effect at the next
--    renewal (schedule_change_at: "cycle_end" on the Razorpay side, so
--    there's nothing to prorate); the webhook clears this and updates
--    `period` once that renewal actually happens.
-- 2. last_payment_failed_at: set by the webhook on payment.failed so the
--    client can show a warning before access silently drops to Free.
--    Cleared whenever the subscription's status is next updated by any
--    webhook event (a resolved failure, a halt, a cancellation, etc. all
--    supersede a stale "your last payment failed" warning).

alter table public.subscriptions
  add column if not exists scheduled_period text check (scheduled_period is null or scheduled_period in ('monthly', 'yearly'));

alter table public.subscriptions
  add column if not exists last_payment_failed_at timestamptz;
