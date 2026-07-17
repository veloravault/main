# Pricing plan enforcement — design

Date: 2026-07-17

## Goal

Turn the marketing pricing tiers (Free / Plus / Family) into real, enforced
account limits, and surface the user's current plan and usage in the profile.
Billing (Razorpay) is not wired up yet, so plan assignment uses a **mock
upgrade** placeholder for now.

## Plans & limits

Defined once in `src/lib/plans.ts` and mirrored in SQL:

| Plan   | Documents      | Wallet/bank records | AI ops / month |
|--------|----------------|---------------------|----------------|
| Free   | none (0 bytes) | 3                   | 5              |
| Plus   | 5 GB           | unlimited           | unlimited      |
| Family | 5 GB / account | unlimited           | unlimited      |

`5 GB = 5 * 1024^3 = 5368709120` bytes. "AI ops" = every Gemini call
(`/api/scan`, `analyzeImageName`, `categorizeDocument`). Family shares Plus's
per-account limits; the multi-seat/5-vault billing side is out of scope (needs
multi-account infrastructure that does not exist).

## Data model (new migration `20260717120000_pricing_plans.sql`)

- `app_members.plan text not null default 'free' check (plan in ('free','plus','family'))`
- `vault_documents.size_bytes bigint not null default 0` — encrypted blob size.
- `public.ai_usage_events (id, user_id, kind, created_at)` + index on
  `(user_id, created_at)`. RLS: users read their own; writes via functions only.

### Functions (all `security definer`, `set search_path = ''`)

- `try_consume_ai_credit(p_user_id uuid) returns boolean` — reads plan; paid →
  insert event + return true; free → count this-calendar-month events, insert +
  return true if `< 5`, else return false. Granted to `service_role` only
  (server is the trust boundary; it has already authenticated the token).
- `get_account_usage() returns table(plan, storage_bytes, storage_limit,
  ai_used, ai_limit, wallet_count, wallet_limit)` — uses `auth.uid()`. Granted
  to `authenticated`. Powers the profile panel in one round-trip.
- `mock_set_plan(p_plan text) returns text` — sets the caller's plan
  (`auth.uid()`), validates the value. Granted to `authenticated`. **Placeholder
  for Razorpay** — replace with a payment-verified path later.

### Triggers (`before insert`)

- `vault_documents` — sum caller's `size_bytes` + `NEW.size_bytes`; raise
  `check_violation` if over the plan byte limit (Free = 0 → all docs blocked).
- `secure_wallet` — block the 4th record on Free.

## Server enforcement

- `/api/scan/route.ts`: after `authenticateActiveMemberRequest`, call
  `try_consume_ai_credit(user.id)` via the admin client; on `false` return HTTP
  `429` with `{ error, code: "AI_LIMIT_REACHED" }` before any Gemini call.
- `actions.ts` (`analyzeImageName`, `categorizeDocument`): same consume call
  after `requireActiveMemberForToken`; throw a typed limit error on `false`.

## App layer (UX on top of the DB limits)

- `DocumentVault` upload: store `size_bytes`; pre-check plan (Free → upgrade
  prompt, over-quota → clear message) for good UX; if the DB insert is still
  rejected, delete the orphaned storage blob and surface the reason.
- AI callers (`GlobalMagicImport`, `WalletVault`, `BankVault`, `DocumentVault`
  rename) detect the limit signal and show an upgrade prompt.

## Profile UI

New settings section **"Plan & usage"** (`PlanSettings.tsx`, id `plan`):
- Current-plan badge + tagline.
- Storage progress bar (used / limit; Free shows a "not included" state).
- AI-usage meter (used / 5, or "Unlimited").
- Wallet-records meter (used / 3, or "Unlimited").
- Mock **Upgrade** controls (Plus / Family / downgrade to Free) → `mock_set_plan`.

Data comes from a single `get_account_usage()` RPC.

## Out of scope

- Razorpay checkout, webhooks, order verification.
- Multi-account "Family" seat management / shared billing.
- Proration / downgrade grace periods.
