# Velora Vault

Velora Vault is an encrypted password and document vault built with Next.js 16, Supabase, Cloudflare R2, and Razorpay. Anyone can sign up; members sign in to the vault application at `/vault`.

## Local setup

Requirements: Node.js 20 or newer, npm, and a Supabase project with `enable_signup = true` (see `supabase/config.toml`).

```bash
npm install
cp env.example.txt .env.local
npm run dev
```

Fill every required value in `.env.local` before testing authenticated or admin routes. Prefer the current `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`; the anon and service-role variables are explicitly temporary legacy fallbacks. Never give a server key a `NEXT_PUBLIC_` prefix.

Cloudflare R2 stores client-encrypted document blobs. Supabase stores account data, encrypted structured vault records, and avatars. Razorpay is the payment authority for recurring Plus subscriptions. The product has two plans only: Free and Plus.

Open [http://localhost:3000](http://localhost:3000). Useful checks:

```bash
npm test
npm run lint
npm run build
npm audit --audit-level=high
```

## Signup architecture

The account lifecycle:

1. A visitor sets an email and password at `/signup`.
2. Supabase Auth creates the account and sends a confirmation email (`supabase/templates/confirmation.html`).
3. The email opens `/confirm-signup`. Its GET renders a confirmation screen but does not consume the token.
4. The explicit POST to `/auth/confirm-signup` verifies the token, establishes the Supabase session, and provisions an `app_members` row (`status='invited'`).
5. `/onboarding` sets the vault master key and activates the membership (`status='active'`).
6. The member enters the vault master key at `/vault` to decrypt vault data locally.

The server-side authorization layer checks the authenticated user, admin UUID, and active `app_members` status at the operation that needs it. `src/proxy.ts` refreshes Supabase cookies only; it is not an authorization boundary. Postgres RLS separately requires ownership and an active membership for vault rows and private storage objects.

Admins can block or permanently revoke a member's access from `/admin` (Members view) at any time. The Activity view is a read-only audit record of owner access changes and completed onboarding events.

## Master-key boundary

The Supabase sign-in password and the vault master key are different secrets. The sign-in password authenticates the account, set once at signup. The master key decrypts vault records and stays in client memory only. It is never sent to Supabase Auth, application Route Handlers, the network, Auth metadata, logs, email, analytics, or persistent browser storage.

Local PIN or biometric wrappers remain device-local conveniences bound to the authenticated user. They do not replace the master key or server authorization.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Public product landing page |
| `/signup` | Create an account |
| `/login` | Sign in |
| `/confirm-signup` | Non-consuming email confirmation review |
| `/auth/confirm-signup` | Same-origin confirmation verification POST |
| `/onboarding` | Master key setup and membership activation |
| `/vault` | Active-member vault application |
| `/admin` | Owner-only member console |

## Production services

- Canonical domain: `https://veloravault.in`; `www.veloravault.in` redirects to the apex domain.
- Supabase: authentication, Postgres/RLS, encrypted structured vault records, and avatars.
- Cloudflare R2: encrypted document blob storage using server-generated signed requests.
- Razorpay: recurring Plus billing and webhook-authoritative plan changes.
- Transactional email: Supabase Auth through the configured SMTP provider.

## Production rollout

Repository code does not configure or mutate the hosted Supabase project's dashboard settings. An operator must confirm "Allow new users to sign up" is enabled, the "Confirm signup" email template is configured, and the `/confirm-signup` redirect URL is allow-listed, on the hosted Supabase project - these must match `supabase/config.toml` but are not automatically synced to a linked hosted project.
