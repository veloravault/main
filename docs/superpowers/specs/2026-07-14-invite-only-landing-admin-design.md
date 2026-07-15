# Invite-Only Velora Vault: Landing, Approval, and Onboarding Design

**Date:** 2026-07-14
**Status:** Design approved in conversation; written specification awaiting final review
**Product direction:** Private Keynote

## 1. Purpose

Transform Velora Vault from a vault-first single screen into a private, invitation-only product with:

- a professional public landing page with an Apple-ecosystem feel;
- a name-and-email access request flow;
- a protected owner-only approval console at `/admin`;
- Supabase-admin invitations sent only after approval;
- first-run onboarding that creates both the Supabase sign-in password and the existing separate vault master key; and
- hard membership gates around the vault and every protected data operation.

The system must preserve the current encryption model. The vault master key remains a separate user-held secret and must never appear in the waitlist, admin console, invitation, Auth metadata, server logs, or server persistence.

## 2. Approved product decisions

| Decision | Approved choice |
| --- | --- |
| Access model | Request access, then receive an invitation after approval |
| Public request fields | Full name and email only |
| Auth user creation | Only after admin approval |
| Admin location | Inside Velora Vault at `/admin` |
| Initial admins | One owner account, extensible to more immutable user IDs later |
| Invitation delivery | Customized Supabase invitation email |
| Public signup | Disabled |
| Landing direction | Private Keynote |
| Master key | Preserve the separate existing master-key model |
| Existing Wallet | No internal Wallet redesign in this project |

## 3. Experience architecture

### 3.1 Route map

| Route | Audience | Responsibility |
| --- | --- | --- |
| `/` | Public | Product story, security explanation, request-access CTA, invited-member sign-in link |
| `/request-access` | Public | Name-and-email request form and generic confirmation state |
| `/login` | Invited or existing members | Supabase sign-in and existing master-key unlock flow |
| `/accept-invite` | Invitation recipients | Display the invitation acceptance step without consuming the token on an email-scanner GET |
| `/auth/confirm` | Invitation recipients | Verify the single-use Supabase token on explicit POST, establish a session, and redirect safely |
| `/onboarding` | Invited members only | Create sign-in password and separate master key before first vault entry |
| `/vault` | Active members only | Existing vault application and navigation |
| `/admin` | Allowed admin user IDs only | Pending requests, invitations, members, retries, and audit visibility |
| `/reset-password` | Existing members | Reset the Supabase sign-in password only; never imply master-key recovery |

The current large client application in `src/app/page.tsx` moves behind `/vault`. The new public root is a separate landing implementation rather than an authenticated conditional branch inside the public page.

### 3.2 Access lifecycle

```text
Public visitor
  -> submits full name and email
  -> pending access request
  -> owner reviews in /admin
  -> invitation dispatch begins
  -> Supabase Auth user is invited
  -> recipient verifies invitation
  -> recipient creates sign-in password and separate master key
  -> membership becomes active
  -> /vault becomes available
```

No password, master key, Auth user, or empty vault is created at the public request stage.

## 4. Public landing: Private Keynote

### 4.1 Narrative

The page has one primary job: establish enough trust for a visitor to request access.

1. Minimal translucent navigation: Velora Vault, Security, Privacy, Sign in, Request access.
2. Eyebrow: “Private by invitation.”
3. Hero: “Everything important. Only yours.”
4. Supporting line: “A calm, encrypted home for passwords, documents, notes and financial essentials.”
5. Primary CTA: Request access.
6. Secondary text link: Already invited? Sign in.
7. Vault Aperture signature moment.
8. Focused product scenes for passwords, documents, notes, Magic Import, and financial essentials.
9. Plain-language security section.
10. Quiet final request-access CTA and minimal footer.

### 4.2 Visual language

- Editorial, product-led composition instead of a SaaS feature grid.
- SF-style system typography with strong optical hierarchy and restrained weights.
- White, soft-neutral, and deep graphite surfaces with one Apple blue action color.
- Generous whitespace, hairline separators, subtle material depth, and no decorative dashboard chrome.
- Dark mode uses separated graphite materials rather than pure-black panels.
- Claims describe the real implementation. The page must not claim “zero knowledge” while non-sensitive index fields such as titles or categories remain queryable.

### 4.3 Signature motion: Vault Aperture

Password, document, note, and financial surfaces converge into a sealed vault window on initial load. Scrolling gently opens the aperture to reveal the product scenes.

- Motion is orchestrated once, not repeated as constant decoration.
- Spring motion is limited to the aperture, navigation transitions, selection, and sheets.
- `prefers-reduced-motion` renders the composed final state immediately.
- Content and CTAs remain usable before animation completes.

## 5. Request-access experience

### 5.1 Form

The form requests only:

- full name;
- email; and
- an invisible honeypot field for basic bot detection.

It does not ask for a message, password, master key, company, phone number, or financial information.

### 5.2 Response semantics

New and duplicate email submissions receive the same success response:

> Request received. If an invitation becomes available, we’ll email you.

This prevents the endpoint from revealing whether an email is already pending, invited, or active.

Correctable format errors are shown inline. Network and offline failures preserve the user’s entered data and offer Retry.

### 5.3 Abuse controls

- Normalize and validate name and email on the server.
- Store a canonical lowercase email for uniqueness while retaining display-safe name capitalization.
- Reject malformed, oversized, or unexpected request bodies.
- Use a database-backed rate limiter before insertion.
- Derive rate-limit fingerprints using an application secret so raw IP addresses do not need to be persisted.
- Treat the honeypot as a generic success rather than revealing bot detection logic.

## 6. Admin approval console

### 6.1 Desktop

The desktop console uses a compact master-detail arrangement:

- sidebar sections for Pending, Invited, Members, and Activity;
- count badge on Pending;
- name/email search;
- status filters;
- request age;
- clear Approve or Review action;
- explicit progress while an invitation is being dispatched;
- inline success transition to Invited; and
- visible failure state with Retry.

### 6.2 Mobile

The mobile console uses touch-friendly request cards instead of squeezed table rows. Search and filters remain at the top. Approval confirmation and request details use the project’s shared bottom-sheet pattern.

### 6.3 Mutation behavior

Invitation dispatch is an external side effect. The UI therefore does not claim success optimistically and does not offer an unreliable post-send Undo.

The safe interaction is:

1. Admin taps Approve.
2. A compact confirmation sheet displays the requester’s name and email.
3. The server atomically acquires the request for invitation.
4. The row shows Sending invitation.
5. The row becomes Invited only after provider confirmation.
6. A failed dispatch becomes Invite failed with Retry and a safe error label.

Double-clicks, repeated requests, browser refreshes, and concurrent admin tabs must not send duplicate invitations.

## 7. Invitation and first unlock

### 7.1 Invitation

Approval invokes Supabase Admin `inviteUserByEmail` from a server-only module. The email uses the configured Velora Vault invitation template and links to `/accept-invite` with the template-provided token hash.

Production delivery requires custom SMTP configured in Supabase Auth. Supabase’s default development mailer is not considered a production delivery solution.

### 7.2 Confirmation

`/accept-invite` renders the calm acceptance screen without verifying the token during the initial GET. This prevents mail-provider link prefetching from consuming the invitation. An explicit user button POSTs the token hash to `/auth/confirm`, which validates it with Supabase, establishes the authenticated session, and redirects to `/onboarding`.

Invalid, used, or expired tokens render a dedicated recovery state. They never land on an empty or partially authenticated vault screen.

### 7.3 Onboarding

The onboarding screen explains the two secrets plainly:

- **Sign-in password:** authenticates the Supabase account.
- **Master key:** encrypts and unlocks sensitive vault content.

The user enters:

- sign-in password;
- master key; and
- master-key confirmation.

The sign-in password is submitted through Supabase Auth. The master key stays inside the client-side vault boundary and follows the existing in-memory unlock, optional PIN wrapper, and optional biometric wrapper model.

There is no server-side master-key recovery. Password reset language must always clarify that resetting the sign-in password does not recover or change the master key.

On successful onboarding, membership transitions to `active` and the user enters `/vault`. Optional PIN or biometric setup remains a subsequent convenience step and never replaces the master key.

The server intentionally cannot verify the value or existence of a master key without violating the approved encryption boundary. Membership activation therefore confirms the authenticated invitation and the server-visible account setup; master-key length and confirmation are checked locally. The real cryptographic gate remains the ability to encrypt and decrypt vault data with the user-held key, not a server-side `onboarded` claim.

## 8. Data model

### 8.1 `access_requests`

| Column | Purpose |
| --- | --- |
| `id uuid primary key` | Stable request identifier |
| `full_name text` | Validated requester name |
| `email text` | Normalized canonical email; unique |
| `status text` | `pending`, `inviting`, `invited`, `invite_failed`, or `active` |
| `requested_at timestamptz` | Initial request time |
| `updated_at timestamptz` | Last state transition |
| `reviewed_at timestamptz null` | First approval time |
| `reviewed_by uuid null` | Admin Auth user ID |
| `invite_started_at timestamptz null` | Lease/recovery timestamp |
| `invited_at timestamptz null` | Provider-confirmed invitation time |
| `activated_at timestamptz null` | Completed onboarding time |
| `auth_user_id uuid null` | Resulting Supabase Auth user ID |
| `invite_attempts integer` | Retry count |
| `last_error_code text null` | Safe operational code, never raw provider payload |

The unique canonical email makes repeated public requests idempotent.

### 8.2 `app_members`

| Column | Purpose |
| --- | --- |
| `user_id uuid primary key` | Immutable Supabase Auth user ID |
| `email text` | Canonical member email |
| `status text` | `invited`, `active`, `suspended`, or `revoked` |
| `access_request_id uuid null` | Originating access request |
| `approved_by uuid null` | Approving admin ID |
| `approved_at timestamptz` | Approval time |
| `activated_at timestamptz null` | Completed onboarding time |
| `created_at timestamptz` | Record creation time |

Existing legitimate Auth users are migrated deliberately into `active` membership so the invite-only launch does not strand existing encrypted data. The owner’s immutable user ID is also configured as the initial admin.

### 8.3 `admin_audit_log`

Records approval attempts, retry actions, state reconciliation, membership suspension, and revocation using actor ID, target IDs, action, safe result code, and timestamp. It contains no access tokens, invitation tokens, passwords, master keys, or raw provider errors.

### 8.4 `access_request_rate_limits`

Stores keyed request fingerprints, time windows, and counts for durable public-form throttling. A scheduled or opportunistic cleanup removes expired windows.

### 8.5 Constraints and indexes

- Check constraints enforce every status enum.
- Canonical request email is unique.
- Membership email is indexed and user ID is unique.
- Pending requests are indexed by status and request time.
- Invitation recovery is indexed by status and `invite_started_at`.
- Audit entries are indexed by actor, target, and timestamp.

## 9. State machine and recovery

```text
pending
  -> inviting
      -> invited
      -> invite_failed

invite_failed
  -> inviting

invited
  -> active
```

- Approval uses a conditional database update so only `pending` or `invite_failed` can acquire `inviting`.
- A unique email and state transition guard prevent normal duplicate sends.
- If the process stops after Supabase sends the invitation but before local state finalizes, the confirmation path reconciles the authenticated user by canonical email and request ID.
- Stale `inviting` rows are shown as Needs reconciliation after a defined lease timeout; Retry first checks for an existing Auth user before another provider action.
- Provider messages are mapped to safe UI codes such as `DELIVERY_FAILED`, `ALREADY_INVITED`, or `CONFIGURATION_ERROR`.

## 10. Authorization and trust boundaries

### 10.1 Admin identity

The initial admin allowlist is an environment variable containing immutable Supabase Auth UUIDs, for example `ADMIN_USER_IDS`. Authorization must not depend on email, editable user metadata, display name, or a client-provided role.

Each admin page load, list request, approval, retry, and membership mutation:

1. verifies the Supabase session on the server;
2. obtains the verified Auth user ID;
3. checks it against the parsed allowlist; and
4. only then creates or uses the privileged admin client.

### 10.2 Member access

`/vault` and every vault Server Action or Route Handler require both:

- a valid authenticated Supabase user; and
- an `app_members.status = 'active'` record for that user.

Protecting only the page is insufficient. Existing data endpoints must use a shared `requireActiveMember` helper so a suspended, revoked, merely invited, or unapproved Auth user cannot call them directly.

### 10.3 Supabase clients

- Browser code prefers the current publishable key, with the legacy anon key supported only as a migration fallback.
- Server components and route handlers use cookie-aware `@supabase/ssr` clients.
- A separate privileged factory uses the current Supabase secret API key, with the legacy service-role key supported only as a migration fallback, and is imported only from server-only modules.
- Neither privileged key is prefixed with `NEXT_PUBLIC_`, serialized to the client, or referenced from a Client Component.

### 10.4 RLS

- `access_requests`: RLS enabled; no direct anonymous or authenticated client reads/writes. Public submission and admin operations go through checked server endpoints.
- `app_members`: members may read only their own non-sensitive membership state; all administrative mutations remain server-mediated.
- `admin_audit_log`: no direct client access.
- `access_request_rate_limits`: no direct client access.
- Existing vault tables retain per-user ownership policies in addition to application-layer active-member enforcement.

### 10.5 Proxy boundary

Next.js Proxy may refresh Supabase cookies and perform early navigation redirects, but it is not the source of authorization truth. Every protected server operation repeats authorization at the point of use.

## 11. Server interfaces

| Interface | Method | Behavior |
| --- | --- | --- |
| `/api/access-requests` | `POST` | Validate, throttle, idempotently create request, return generic confirmation |
| `/api/admin/access-requests` | `GET` | Admin-only paginated/filterable request list |
| `/api/admin/access-requests/[id]/approve` | `POST` | Admin-only guarded invitation transition |
| `/api/admin/access-requests/[id]/retry` | `POST` | Admin-only reconciliation and safe retry |
| `/api/admin/members` | `GET` | Admin-only member list |
| `/api/admin/members/[id]` | `PATCH` | Admin-only suspend/revoke transition |
| `/auth/confirm` | `POST` | Verify invitation token after explicit user action and redirect to onboarding |
| `/api/onboarding/complete` | `POST` | Authenticated invited-user activation after server-visible account setup and local master-key confirmation |

All mutation interfaces require exact content types, bounded bodies, schema validation, generic client errors, structured safe logs, and same-origin/CSRF protections appropriate to their request mechanism.

## 12. Loading, empty, error, and offline states

### Public

- loading button with stable width;
- inline validation;
- generic request-received success;
- offline message and Retry without data loss;
- server-unavailable message without exposing infrastructure.

### Admin

- skeletons shaped like final request rows/cards;
- pending-empty and search-empty states;
- unauthorized and expired-session states;
- sending, invited, invite-failed, stale-inviting, and retrying states;
- pagination without layout jumps;
- visible last-updated time when the queue is refreshed.

### Onboarding

- invalid/expired/used invitation;
- existing active member redirect to `/vault`;
- invited but incomplete return to `/onboarding`;
- password validation without leaking provider internals;
- master-key mismatch handled locally;
- network failure that never discards the locally entered master-key fields until the user leaves or clears the form.

## 13. Accessibility and responsive behavior

- Semantic headings, landmarks, labels, descriptions, and error associations.
- Full keyboard operation and visible focus treatment.
- Minimum 44-by-44-pixel touch targets on mobile.
- Focus trapping and restoration for sheets and dialogs.
- No background scroll while a sheet is active.
- Screen-reader announcement for request completion, invitation progress, errors, and membership changes.
- Desktop admin master-detail becomes stacked mobile cards; it never horizontally scrolls a desktop table.
- Landing content remains readable and actionable at 320 CSS pixels.
- Reduced-motion handling covers every Framer Motion path and CSS animation.

## 14. Verification strategy

### Automated

- Unit coverage for name/email normalization, redirect allowlisting, admin allowlist parsing, safe provider-error mapping, and rate-limit fingerprints.
- Route tests for anonymous, invited, active, non-admin, and admin callers.
- State-machine tests for first approval, double approval, failure, retry, stale invitation reconciliation, and activation.
- SQL/RLS verification for direct anonymous/authenticated access attempts.
- Project-integrity checks protecting the master-key boundary and preventing privileged Supabase key imports in client modules.
- Existing lint, unit test, production build, and dependency audit gates.

### Browser verification

- Public landing at desktop, tablet, and 320/375/430-pixel mobile widths.
- Request form validation, duplicate-safe success, offline recovery, and keyboard flow.
- Login and password-reset wording.
- Admin pending, empty, search, approve, failure, and Retry states on desktop and mobile.
- Prefetched invitation landing, valid acceptance, expired invitation, incomplete onboarding, and completed onboarding.
- `/vault` rejection for pending/invited/revoked users and success for active users.
- Light, dark, and reduced-motion modes.
- Zero unexpected console errors on the principal paths.

Email deliverability and the hosted Supabase invitation link require a controlled live-environment verification after SMTP, redirect URLs, and templates are configured.

## 15. External configuration and rollout

The repository cannot complete these hosted Supabase changes by itself. Release requires an operator checklist:

1. Apply database migrations and policies.
2. Backfill legitimate existing members as active.
3. Add the owner’s immutable Auth UUID to `ADMIN_USER_IDS`.
4. Add the server-only Supabase secret API key and rate-limit secret to the deployment environment; retire the legacy service-role key after verification.
5. Disable public signup in Supabase Auth.
6. Configure production custom SMTP.
7. Install the branded invitation template.
8. Allowlist production and local confirmation/onboarding URLs.
9. Send and complete one controlled invitation.
10. Verify that anonymous signup and protected endpoint access fail.

The application should expose a clear admin configuration error when required server variables are absent, while public pages remain available.

## 16. Non-goals

- Public or self-service signup.
- Multi-role organization management.
- Billing, subscriptions, or invite quotas.
- Direct Resend integration outside Supabase Auth.
- Social login.
- Admin access based on email or mutable metadata.
- Master-key escrow, recovery, reset, synchronization, or delivery.
- Internal Wallet redesign.
- Rewriting existing encrypted vault data.

## 17. Acceptance criteria

The feature is complete when:

1. A visitor can understand the product and submit only name and email.
2. Duplicate submissions reveal no membership or request status.
3. No Auth user is created before explicit owner approval.
4. Only the configured owner UUID can open or mutate `/admin`.
5. Approval sends one branded Supabase invitation and records a recoverable state.
6. An invited user must complete password and separate master-key onboarding before vault access.
7. Pending, invited, suspended, revoked, anonymous, and non-admin users cannot reach protected data operations.
8. The master key never crosses the existing client-side vault boundary.
9. Existing legitimate members retain access after the membership migration.
10. Landing, request, login, admin, and onboarding experiences pass responsive, accessibility, dark-mode, reduced-motion, console, build, and security checks.
