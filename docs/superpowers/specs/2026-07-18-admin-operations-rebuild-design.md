# Admin Operations Rebuild Design

**Date:** 2026-07-18  
**Status:** Approved for implementation planning  
**Branch:** `main` only; no worktree or feature branch

## Objective

Turn the existing owner console into a reliable, responsive operations surface without expanding it into a billing override or account-deletion console. The work must repair support replies and other owner mutations, add useful operational visibility and controls, preserve the current owner-only authorization model, and pass production build verification.

## Confirmed Current Failures

1. Admin reply, ticket-status, and member-status mutations reject valid local requests with `403 ORIGIN_MISMATCH`. `assertSameOrigin` compares the browser's localhost origin only with the configured canonical production URL.
2. Support errors are reduced to a generic toast, hiding the actionable server error and making the reply appear to fail silently.
3. The admin has only Members, Support, and Activity. It has no operational overview or member detail/usage surface.
4. Member actions crowd list rows, especially on narrow phones, instead of living in a focused detail surface.
5. The support interface behaves as a modal-only thread rather than a durable inbox on desktop and a purpose-built thread view on mobile.
6. The current dirty working tree contains a client/server import boundary through `PublicPageShell` that prevents `next build`; deployment verification cannot be considered green until that boundary is repaired.

## Scope

### Included

- Owner overview metrics.
- Responsive member list and member detail drawer/sheet.
- Read-only member plan and usage visibility.
- Restore, block, revoke, and resend-setup-email actions.
- Reliable support inbox, thread replies, resolve/reopen, retry, and clear errors.
- Improved audit activity filtering and presentation.
- Responsive admin shell and mobile layouts.
- Same-origin mutation repair that supports canonical production, trusted preview/request origins, and local development while retaining CSRF enforcement.
- Build-boundary repair necessary to verify and deploy the admin work.
- Server, authorization, repository, migration, UI, responsive, and authenticated browser tests.

### Excluded

- Manual Free/Plus plan overrides.
- Subscription or Razorpay mutation from the admin.
- Permanent account or Auth user deletion.
- A control claiming to invalidate already-issued JWT access tokens immediately.
- Reading decrypted vault secrets or document contents from the admin.

## Architecture

Retain the current layered model:

1. Server-rendered `/admin` performs the initial `requireAdmin` gate.
2. Owner-only route handlers repeat `requireAdmin` before every read or mutation.
3. Mutations enforce same-origin and bounded JSON validation before repository work.
4. Server repositories use the service-role client and return narrow DTOs only.
5. Sensitive state changes are transactionally recorded in `admin_audit_log`.
6. Client components apply state only after a server-confirmed response.

The rebuild is evolutionary rather than a new framework or a single oversized admin endpoint. Each view receives a narrow API and component boundary.

## Same-Origin Repair

`assertSameOrigin(request)` will validate the normalized `Origin` or `Referer` against a trusted origin set derived from:

- The configured canonical `APP_URL` origin.
- The actual normalized request URL origin, which represents localhost or the deployment host receiving the request.

Malformed, missing, `null`, or mismatched origins remain rejected unless a valid same-origin `Referer` is present. Tests will cover canonical production, localhost, preview/request host, hostile cross-origin, malformed headers, and absent headers. Diagnostic logging must not include secrets, cookies, or request bodies.

## Owner Overview

Add an `overview` admin view and owner-only summary API. It returns:

- Total members and counts by invited, active, suspended, and revoked.
- Free and Plus member counts.
- Open, awaiting-owner-reply, and resolved support counts.
- Aggregate document bytes and AI events for the current billing month.
- Recent audit activity using the existing sanitized activity DTO.

Overview cards navigate to the corresponding filtered Members, Support, or Activity view. Metrics are operational summaries only; no decrypted vault data is exposed.

## Member Operations

The member list remains searchable and filterable, but rows become compact selection targets. Selecting a member opens a desktop side drawer or mobile bottom sheet containing:

- Email, access status, read-only plan, joined date, and activation date.
- Document bytes and count, AI usage for the current month, and counts of passwords, notes, wallet records, bank accounts, and support tickets.
- Restore access for suspended members.
- Block access for invited or active members.
- Permanently revoke access for non-revoked members.
- Resend the setup/invitation email only when the member is still invited and eligible.

Every mutation uses an explicit confirmation that describes reversibility, waits for the server response, refreshes the authoritative DTO, and writes an audit entry. The owner cannot mutate their own access status from this console.

“Block access” is the truthful immediate application control. Existing access JWTs may live until expiry, but server authorization and RLS continue to require active membership, so protected app access is denied without advertising an unsupported instant global sign-out guarantee.

## Support Inbox

Desktop Support becomes a two-column inbox with ticket list and persistent thread. Mobile Support uses a ticket list followed by a full-screen thread view with a safe-area-aware sticky composer.

Filters are Open, Needs reply, Resolved, and All. Ticket rows show member, subject, status, last sender, and last activity. The thread:

- Loads messages in chronological order and scrolls to the latest message.
- Sends replies through the owner-only route.
- Shows the actual mapped failure inline while preserving the unsent draft.
- Prevents duplicate sends while a request is in flight.
- Appends only a server-confirmed reply.
- Supports resolve and reopen without closing the thread.
- Refreshes list summary fields after replies and status changes.

The member-facing ticket UI remains ownership- and active-membership-restricted through explicit grants and RLS.

## Activity

Activity remains read-only and sanitized. Add filters for access, support, invitation, and system actions, plus result status. Maintain cursor pagination and never return raw payloads, decrypted data, tokens, or internal secrets.

## Responsive Layout

- Desktop: compact sidebar, sticky top bar, overview grid, split support inbox, and member drawer.
- Tablet: narrower sidebar and single-column content where needed.
- Mobile: safe-area header, horizontally stable section navigation, compact typography, full-width cards, bottom-sheet member details, and full-screen support thread.
- All interactive targets must be at least 44 CSS pixels where practical.
- No horizontal document overflow at 320, 400, 768, or 1440 CSS-pixel widths.
- Loading, empty, error, success, and disabled states must preserve layout rather than flash or collapse.

## Build Boundary

Repair the public shell's server/client boundary without weakening `server-only` enforcement. Server-side signed-in state may be resolved by a server wrapper and passed into the client navigation as serializable data. Client modules must not import `@/lib/server/*` transitively.

## Error Handling

Admin APIs return stable codes and appropriate HTTP statuses. Client views map codes to concise inline messages and use toasts only as secondary feedback. Authorization failures clear protected state and redirect or refresh appropriately. Network failures retain drafts and expose retry actions. Repository errors are logged server-side with safe context but are not returned verbatim.

## Testing and Verification

Implementation follows red-green TDD. Required evidence:

1. Unit tests for trusted-origin validation, query validation, DTO shaping, and filters.
2. Route-boundary tests proving authorization, same-origin checks, bounded bodies, and audit behavior.
3. Schema tests for grants, RLS, and any transactional RPC introduced for resend/audit behavior.
4. UI integrity tests for Overview, member details, Support, Activity, confirmations, and responsive semantics.
5. Full `npm test`, `npm run lint`, `git diff --check`, and `npm run build`.
6. Authenticated browser verification on localhost at 320x568, 400x921, 768x1024, and 1440x900.
7. Real non-destructive reads and one owner reply/status test on the owner's existing support ticket. Destructive member transitions and resend email require explicit target confirmation during verification.

## Success Criteria

- The configured owner can load every admin view with the supplied account.
- Support replies and status changes succeed locally and on the canonical deployment.
- Valid local admin mutations no longer return `ORIGIN_MISMATCH`; hostile cross-origin requests still return 403.
- The console exposes Overview, Members, Support, and Activity with the controls defined above.
- Member billing remains read-only and no account-delete control exists.
- Admin layout is usable without horizontal overflow at every target width.
- Tests, lint, diff checks, production build, and authenticated browser checks are green.

