# Velora Vault Project Context

Last updated: 2026-07-17

## Project identity

- Product: Velora Vault
- Repository: `https://github.com/veloravault/main`
- Canonical production URL: `https://veloravault.in`
- Legacy deployment URL: `https://veloravault.vercel.app`
- Vercel project: `veloravault/main`
- Supabase project ref: `bzwkzklitrzwqksjmmby`
- Product category: encrypted personal vault with open signup
- Visual direction: calm, premium, Apple-ecosystem inspired

`www.veloravault.in` must redirect to the apex domain. Do not introduce a second canonical host.

## Current product model

Velora Vault stores passwords, encrypted documents, secure notes, wallet cards, and bank-account details. The public site links to dedicated `/login` and `/signup` pages; the older sign-in/signup popup has been removed.

Account authentication and vault decryption are separate trust layers:

- Supabase Auth verifies the account sign-in password.
- A separate vault master key decrypts vault contents locally.
- The master key stays in client memory and is never sent to Supabase, Route Handlers, analytics, logs, email, or persistent browser storage.

The product has two plans only:

- Free
- Plus

There is no Family plan or seat-management functionality. Legacy `family` rows are migrated to Plus by the latest pricing migration.

## Current user journey

1. A visitor opens `/signup` and creates an account.
2. Supabase sends the confirmation email.
3. `/confirm-signup` presents the confirmation action without consuming the token on GET.
4. `/auth/confirm-signup` verifies the token on explicit POST and provisions the membership.
5. `/onboarding` configures the vault master key, recovery acknowledgement, optional PIN/biometric conveniences, and activates the membership.
6. The completion screen waits for the user to choose **Open my vault**.
7. `/vault` requires the active Supabase account and the separate local master key.

`/request-access` and the old invite design documents are historical compatibility context, not the current acquisition flow.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Public product landing page |
| `/pricing` | Free and Plus pricing |
| `/login` | Account sign in |
| `/signup` | Open account signup |
| `/confirm-signup` | Non-consuming confirmation review |
| `/auth/confirm-signup` | Same-origin token verification POST |
| `/onboarding` | Vault setup and membership activation |
| `/vault` | Private encrypted vault application |
| `/admin` | Owner-only member and audit console |
| `/privacy`, `/terms`, `/security` | Public trust and legal pages |

## Runtime architecture

- Next.js `16.2.10`, React `19.2.7`, TypeScript, Tailwind CSS 4, Framer Motion.
- Supabase Auth for accounts and sessions.
- Supabase Postgres with RLS for membership, billing state, and encrypted structured vault records.
- Supabase Storage for avatars.
- Cloudflare R2 for client-encrypted document blobs.
- Razorpay for recurring Plus subscriptions; webhooks are authoritative for paid-plan changes.
- Supabase Auth with configured SMTP for transactional account email.
- Google Gemini and configured AI services only for user-requested AI import/categorization operations.

R2 credentials, Razorpay secrets, Supabase secret keys, and SMTP credentials are server-only. Never add them to `NEXT_PUBLIC_*`, committed files, shell allowlists, logs, screenshots, or test fixtures.

## Security and authorization

- RLS checks row ownership and active membership for protected vault data.
- `src/proxy.ts` refreshes cookies but is not an authorization boundary.
- Protected server operations repeat authentication and membership authorization at the point of use.
- Owner access is based on immutable configured Supabase user UUIDs, not email or editable metadata.
- Admin member transitions are monotonic: active/invited can be blocked, and non-revoked accounts can be permanently revoked. The current console does not restore either state.
- The admin Activity view reads the real `admin_audit_log`; it is not placeholder content.
- PIN and platform-authenticator unlock are local convenience wrappers and do not replace the master key.

## Storage and deletion

- Structured records are encrypted before being written to Supabase.
- Document bytes are encrypted in the browser and uploaded to Cloudflare R2 through presigned requests.
- Account deletion removes R2 objects under the user prefix and cleans applicable Supabase records/storage.
- AI-assisted import is an explicit exception to local-only source processing: only material selected for the requested operation is sent to the configured processor before the reviewed result is encrypted.

## Billing

- Free and Plus are the only supported plan IDs.
- Checkout creates Razorpay subscriptions server-side.
- The verification endpoint validates the returned subscription proof but does not independently grant paid access.
- Razorpay webhooks are the source of truth for activation, renewal, cancellation, and reversion to Free.
- Cancellation is scheduled for the end of the paid cycle; access must not be removed immediately when the user clicks cancel.

## UI direction

- Preserve the established Apple-like shell, compact hierarchy, native-feeling sheets, grouped lists, frosted materials, and safe-area behavior.
- Prefer dedicated pages for major account journeys. Authentication uses `/login` and `/signup`, not a marketing-page popup.
- Use authentic brand assets for external payment marks. Do not redraw payment logos in CSS or SVG code.
- Landing-page product previews should depict Velora Vault itself, not unrelated template screenshots.
- Keep mobile and desktop both first-class; admin is an operational product surface, not a placeholder dashboard.

## Development and release

```bash
npm install
npm test
npm run lint
npx tsc --noEmit
npm run build
npm audit --audit-level=high
```

All database changes must be new files in `supabase/migrations/`. Before production release, verify migrations against the linked Supabase project, hosted Auth redirect URLs and SMTP, R2 CORS/credentials, Razorpay plans/webhook secret, and both the apex and `www` domain behavior.

## Start here next time

- [README.md](../README.md)
- [src/app/page.tsx](../src/app/page.tsx)
- [src/components/VaultApp.tsx](../src/components/VaultApp.tsx)
- [src/components/auth/OnboardingFlow.tsx](../src/components/auth/OnboardingFlow.tsx)
- [src/components/admin/AdminConsole.tsx](../src/components/admin/AdminConsole.tsx)
- [src/lib/server/access-repository.ts](../src/lib/server/access-repository.ts)
- [src/lib/server/r2.ts](../src/lib/server/r2.ts)
- [src/app/api/payments](../src/app/api/payments)
- [supabase/migrations](../supabase/migrations)
