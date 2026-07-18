-- Razorpay explicitly does not guarantee webhook delivery order. Record the
-- provider event time so an older retry cannot overwrite a newer state and,
-- for example, revoke an already-reactivated subscription.

alter table public.subscriptions
  add column if not exists last_razorpay_event_at timestamptz;
