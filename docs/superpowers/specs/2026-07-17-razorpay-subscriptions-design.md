# Razorpay recurring subscriptions - design

Date: 2026-07-17

## Goal

Replace `mock_set_plan` with real, auto-recurring billing via Razorpay
Subscriptions (not one-time Orders): the user authorizes a mandate once
(UPI Autopay / card e-mandate), Razorpay auto-charges every cycle, and our
webhook is the sole authority that grants/revokes the plan. Test mode first;
swap `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` for live keys later (same
env-var swap pattern as Supabase/R2).

## Objects & config

4 Razorpay **Plans** already created via the API (one per plan×period),
IDs in env: `RAZORPAY_PLAN_{PLUS,FAMILY}_{MONTHLY,YEARLY}`. A **Subscription**
is created per user per upgrade. Env: `RAZORPAY_KEY_ID` (also exposed to the
client - it's a public identifier, not a secret), `RAZORPAY_KEY_SECRET`
(server-only), `RAZORPAY_WEBHOOK_SECRET` (server-only).

No Razorpay SDK - plain `fetch` against `https://api.razorpay.com/v1/*` with
HTTP Basic Auth (`key_id:key_secret`). Confirmed working against the test
account (plans created successfully).

## Data model (new migration)

- `public.subscriptions` (service-role only, 1 row per user's active/most-recent
  subscription attempt): `user_id`, `razorpay_subscription_id` (unique),
  `razorpay_customer_id`, `plan` (`plus`/`family`), `period` (`monthly`/`yearly`),
  `status` (`created`/`authenticated`/`active`/`pending`/`halted`/`cancelled`/`completed`),
  `current_period_end timestamptz`, `created_at`, `updated_at`.
- `public.payment_events` (webhook audit + idempotency): `id bigint identity`,
  `razorpay_event_id text unique not null`, `event_type text`, `payload jsonb`,
  `processed_at timestamptz`. The unique constraint on `razorpay_event_id` is
  the idempotency guard - a replayed webhook does a no-op insert-conflict and
  returns 200 without reprocessing.
- `app_members.plan` stays the single source of truth the rest of the app
  (quota triggers, `get_account_usage`) already reads - the webhook handler
  updates it directly via the admin client. `mock_set_plan` RPC is dropped.

## Routes (Node runtime, `src/lib/server/razorpay.ts` wraps the REST calls)

- `POST /api/payments/create-subscription` - auth
  (`authenticateActiveMemberRequest`), body `{plan: 'plus'|'family', period:
  'monthly'|'yearly'}` (server maps to a fixed plan_id - client never supplies
  a Razorpay ID or amount, closing off price tampering). Creates/reuses a
  Razorpay customer (search by email, else create), creates a subscription
  (`total_count` large enough to represent "until cancelled", `customer_notify:
  1`), upserts a `subscriptions` row (`status='created'`), returns
  `{subscriptionId, keyId}`.
- `POST /api/payments/verify` - body `{razorpay_payment_id,
  razorpay_subscription_id, razorpay_signature}`. Verifies
  `HMAC_SHA256(payment_id + "|" + subscription_id, key_secret) ==
  razorpay_signature`. On success, returns the current local subscription
  status for immediate UI feedback. **Does not itself grant the plan** - a
  client-side callback is not proof of payment; only the webhook does that.
- `POST /api/payments/webhook` - reads the **raw** body (before any JSON
  parsing) to verify `X-Razorpay-Signature` (`HMAC_SHA256(rawBody,
  webhook_secret)`), constant-time compare. On failure: 400, no processing.
  Insert into `payment_events` keyed by the event's `id` - `ON CONFLICT DO
  NOTHING`; if no row was inserted (already seen), return 200 immediately
  (idempotent replay). Otherwise dispatch on `event`:
  - `subscription.activated` / `subscription.charged` - look up the
    `subscriptions` row by `razorpay_subscription_id`, set `status='active'`,
    `current_period_end` from the payload's `current_end` (unix seconds), and
    set `app_members.plan` to the row's `plan`.
  - `subscription.pending` - retry in progress; set `status='pending'`, do
    **not** change `app_members.plan` yet (grace period while Razorpay retries).
  - `subscription.halted` - retries exhausted; set `status='halted'` and
    revert `app_members.plan` to `'free'` immediately.
  - `subscription.cancelled` / `subscription.completed` - set `status`
    accordingly; revert `app_members.plan` to `'free'` (cancellation in this
    v1 is immediate, not deferred to period end - see Out of scope).
  - `payment.failed` - logged only (via the audit table); no plan mutation,
    Razorpay's own retry schedule handles it.
- `POST /api/payments/cancel` - auth, looks up the caller's `subscriptions`
  row, calls Razorpay's cancel endpoint, updates local `status='cancelled'`.
  The webhook confirms and reverts the plan (defense in depth: both the direct
  response and the webhook path lead to the same state).

## Client (`PlanSettings.tsx`)

- Adds a monthly/yearly toggle (currently only one price is shown).
- "Upgrade" → `create-subscription` → loads `checkout.razorpay.com/v1/checkout.js`
  dynamically → opens Checkout with `{key: keyId, subscription_id:
  subscriptionId}` → on handler success, posts to `verify` for immediate
  feedback, then polls `get_account_usage` a few times (webhook is
  typically near-instant but is the real source of truth) until the plan
  reflects the upgrade or a short timeout elapses ("still confirming - refresh
  in a moment").
- "Cancel" action for an active paid plan → `cancel` route.
- `mock_set_plan` call site removed entirely.

## Security notes

- Webhook signature check uses the untouched raw request body - Next.js route
  reads `await request.text()` first, never `request.json()` before verifying.
- `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` never reach the client;
  only `RAZORPAY_KEY_ID` (public by design) does, via the `create-subscription`
  response.
- Client cannot choose a Razorpay plan_id or amount directly - only our fixed
  `plan`/`period` enum, mapped server-side.

## Out of scope (v1)

- Cancel-at-cycle-end (grace period after cancelling) - v1 cancels immediately;
  revisit if it matters for UX.
- Proration on plan switch (e.g. Plus → Family mid-cycle) - user cancels then
  re-subscribes for v1.
- Dunning emails / in-app "your payment failed, update your card" UI beyond
  what Razorpay's own retry + webhook `pending`/`halted` states provide.
- Local webhook testing tooling (ngrok) - webhooks are only exercised against
  the deployed Vercel URL; documented as a limitation for local dev.

## Verification

- `npm run build` clean.
- Test-mode round trip: create a subscription, authorize with Razorpay's test
  UPI/card, confirm the webhook flips `app_members.plan` and `PlanSettings`
  reflects it.
- Confirm a replayed webhook payload is a no-op (idempotency).
- Confirm an invalid webhook signature is rejected with no state change.
