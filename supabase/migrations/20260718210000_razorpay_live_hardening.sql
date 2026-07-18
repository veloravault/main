-- Keep local subscription state aligned with Razorpay's complete lifecycle and
-- prevent two concurrent checkout requests from creating two open mandates.

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'));

-- Old dismissed test checkouts can legitimately leave more than one `created`
-- row. Only the newest can still be reused; close older local attempts before
-- enforcing the one-open-checkout invariant.
with ranked_created as (
  select id,
         row_number() over (partition by user_id order by created_at desc, id desc) as position
  from public.subscriptions
  where status = 'created'
)
update public.subscriptions as subscriptions
set status = 'cancelled', updated_at = now()
from ranked_created
where subscriptions.id = ranked_created.id
  and ranked_created.position > 1;

create unique index if not exists subscriptions_one_open_per_user
  on public.subscriptions (user_id)
  where status = 'created';
