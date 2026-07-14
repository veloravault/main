# Telkar Vault

Telkar Vault is an invite-only encrypted vault built with Next.js 16 and Supabase. The public experience is a restrained product landing page and access request flow; approved members sign in to the existing vault application at `/vault`.

## Local setup

Requirements: Node.js 20 or newer, npm, and a Supabase project whose database and Auth settings follow [`docs/invite-only-rollout.md`](docs/invite-only-rollout.md).

```bash
npm install
cp env.example.txt .env.local
npm run dev
```

Fill every required value in `.env.local` before testing authenticated or admin routes. Prefer the current `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`; the anon and service-role variables are explicitly temporary legacy fallbacks. Never give a server key a `NEXT_PUBLIC_` prefix.

Open [http://localhost:3000](http://localhost:3000). Useful checks:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=high
```

## Invite-only architecture

The access lifecycle is intentionally narrow:

1. A visitor submits only name and email at `/request-access`.
2. The server normalizes the request, applies same-origin/body/rate-limit controls, and stores a pending record.
3. An owner whose immutable Supabase Auth UUID is in `ADMIN_USER_IDS` opens `/admin` and approves the request.
4. The privileged server client sends one Supabase invitation. Public signup is not part of the application.
5. The email opens `/accept-invite`. Its GET renders a confirmation screen but does not consume the token.
6. The explicit POST to `/auth/confirm` verifies the invite and establishes the Supabase session.
7. `/onboarding` creates the account sign-in password and activates the membership.
8. The member enters the existing vault master key at `/vault` to decrypt vault data locally.

The server-side authorization layer checks the authenticated user, admin UUID, and active `app_members` status at the operation that needs it. `src/proxy.ts` refreshes Supabase cookies only; it is not an authorization boundary. Postgres RLS separately requires ownership and an active membership for vault rows and private storage objects.

## Master-key boundary

The Supabase sign-in password and the vault master key are different secrets. The sign-in password authenticates the account. The master key decrypts vault records and stays in client memory only. It is never sent to Supabase Auth, application Route Handlers, the network, waitlist rows, Auth metadata, logs, email, analytics, or persistent browser storage.

Local PIN or biometric wrappers remain device-local conveniences bound to the authenticated user. They do not replace the master key or server authorization.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Public product landing page |
| `/request-access` | Enumeration-safe waitlist request |
| `/login` | Sign in for invited members |
| `/accept-invite` | Non-consuming invitation review |
| `/auth/confirm` | Same-origin invitation verification POST |
| `/onboarding` | Sign-in password creation and membership activation |
| `/vault` | Active-member vault application |
| `/admin` | Owner-only request queue |

## Production rollout

Repository code does not configure or mutate the hosted Supabase project. An operator must complete the ordered backup, SQL, Auth, SMTP, DNS, verification, and rollback procedure in [`docs/invite-only-rollout.md`](docs/invite-only-rollout.md). The invitation body to install in Supabase is [`docs/supabase/invite-email.html`](docs/supabase/invite-email.html).
