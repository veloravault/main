# Velora Vault Project Context

Last updated: 2026-07-16

## Project identity

- Product name: `Velora Vault`
- GitHub repository: `https://github.com/veloravault/main`
- Production URL: `https://veloravault.in` (custom domain live as of 2026-07-17; `https://veloravault.vercel.app` still resolves but is no longer canonical)
- Vercel project: `veloravault/main`
- Supabase project ref: `bzwkzklitrzwqksjmmby`
- Product category: invite-only encrypted personal vault
- Core promise: a calm, Apple-like, premium vault for passwords, documents, notes, wallet items, and bank-account details

## Product summary

This project is a Next.js 16 + React 19 + Supabase application that combines:

- a public marketing and access-request experience
- an invite-only member onboarding flow
- a private vault application behind active membership checks
- an owner-only admin console for approval of access requests

The app is intentionally split between two trust layers:

- account access through Supabase Auth
- local vault decryption through a separate master key

The sign-in password and vault master key are different secrets.

## Current user journey

### Public flow

1. Visitor lands on `/`
2. Visitor requests access at `/request-access` using only name and email
3. Request is stored as a pending access request
4. Owner reviews requests in `/admin`
5. Approved user receives a Supabase invitation email

### Invite and onboarding flow

1. User opens `/accept-invite`
2. Explicit POST to `/auth/confirm` verifies the invite
3. User completes `/onboarding`
4. User creates the account sign-in password
5. User reaches `/vault`
6. User enters the separate vault master key to decrypt vault data locally

### Private app flow

Once unlocked, members use a native-app-style vault shell with these main modules:

- Dashboard
- Passwords
- Documents
- Notes
- Wallet
- Bank Accounts
- Settings

## Main routes

- `/`: public landing page
- `/request-access`: invite request form
- `/login`: member sign-in
- `/accept-invite`: non-consuming invitation review
- `/auth/confirm`: same-origin invite confirmation step
- `/onboarding`: invited-member activation flow
- `/vault`: authenticated vault experience
- `/admin`: owner-only approval console

## Core architecture

### Frontend

- Framework: `Next.js 16.2.10`
- React: `19.2.7`
- Motion: `framer-motion`
- Theming: `next-themes`
- UI direction: Apple-inspired desktop master-detail plus mobile sheet/tab patterns

Important top-level UI files:

- [src/app/page.tsx](../src/app/page.tsx)
- [src/components/VaultApp.tsx](../src/components/VaultApp.tsx)
- [src/components/settings/Settings.tsx](../src/components/settings/Settings.tsx)
- [src/app/globals.css](../src/app/globals.css)

### Backend and data

- Backend platform: Supabase
- Auth: Supabase Auth
- Data layer: Postgres with RLS
- Storage: Supabase Storage
- Server-side access control helpers live under `src/lib/server/*`

Important server and security files:

- [src/lib/server/access.ts](../src/lib/server/access.ts)
- [src/lib/server/access-repository.ts](../src/lib/server/access-repository.ts)
- [src/lib/server/invitations.ts](../src/lib/server/invitations.ts)
- [src/lib/vaultSession.ts](../src/lib/vaultSession.ts)
- [src/lib/crypto.ts](../src/lib/crypto.ts)
- [src/proxy.ts](../src/proxy.ts)

## Security model

### Hard boundaries

- The vault master key remains client-side only
- The master key must never be sent to Supabase Auth, Route Handlers, logs, analytics, email, or persistent browser storage
- Account authorization depends on both authentication and active membership status
- Owner-only actions depend on immutable configured admin UUIDs, not email similarity or user metadata

### Active membership model

The invite-only system uses an `app_members` layer in addition to normal authentication.

- unauthenticated users cannot access vault or admin data
- invited but inactive users cannot access vault data
- active members can access only their own vault rows and private storage objects
- admins can review and approve access requests

### Local unlock conveniences

- PIN and local biometrics are device-local wrappers
- they do not replace the master key
- they do not weaken server-side authorization rules

## UI and product direction

The established visual direction for this repo is:

- Apple-like
- calm, premium, restrained
- mobile-first in behavior, but polished on desktop too
- reduced visual noise
- native-feeling sheets, tab bars, grouped lists, and frosted surfaces

Important design themes already implemented:

- shared desktop master-detail patterns
- shared mobile bottom-sheet patterns
- invite-only landing page with a more polished product-marketing layer
- settings redesigned in an iOS-settings-like structure

Wallet was treated as a specially polished area and should not be casually redesigned unless explicitly requested again.

## Feature areas present in the repo

- Password vault
- Document vault
- Secure notes
- Wallet and payment cards
- Bank accounts
- Global magic import
- AI-assisted vault search
- Connectivity banner and offline-aware states
- Auto-lock and local unlock helpers
- Settings for account, security, appearance, backup, legal, and danger zone
- Admin queue for access requests and approvals

## Invite-only operational notes

The hosted rollout is active on the new Velora Vault GitHub, Vercel, and Supabase accounts. Future schema changes must be created as migrations under `supabase/migrations/` and applied through the linked Supabase project.

Key rollout docs:

- [README.md](../README.md)
- [docs/invite-only-rollout.md](invite-only-rollout.md)
- [docs/supabase/invite-email.html](supabase/invite-email.html)
- [supabase/config.toml](../supabase/config.toml)
- [supabase/migrations](../supabase/migrations)

The rollout doc covers:

- backup-first migration procedure
- invite-access schema deployment
- owner UUID setup
- SMTP and invite email configuration
- disabling public signup
- denial-path verification
- retirement of legacy keys

## Local development

### Stack

- Node.js 20+
- npm
- Next.js 16
- TypeScript
- Tailwind CSS 4
- Supabase SSR and Supabase JS

### Main scripts

- `npm run dev`
- `npm test`
- `npm run lint`
- `npm run build`

Tests currently run through:

- `node --test tests/*.test.mjs`

## Current infrastructure state

Verified on 2026-07-16:

- branch: `main`
- GitHub remote: `https://github.com/veloravault/main.git`
- production URL: `https://veloravault.in` (migrated from `https://veloravault.vercel.app` on 2026-07-17)
- Vercel project is linked to `veloravault/main` with production branch `main`
- Supabase project ref: `bzwkzklitrzwqksjmmby`
- Supabase schema and data migrations are tracked in `supabase/migrations/`
- local browser artifacts and provider probe scripts are intentionally ignored

## Important current decisions

- The project is invite-only, not open-signup
- Name + email is the public intake, nothing more
- Admin approval is the gate to access
- The sign-in password is separate from the vault master key
- The vault master key model must remain intact
- The UI language should stay premium and Apple-like
- The admin console is part of the product, not an afterthought

## Good files to read first next time

- [README.md](../README.md)
- [docs/invite-only-rollout.md](invite-only-rollout.md)
- [src/components/VaultApp.tsx](../src/components/VaultApp.tsx)
- [src/app/page.tsx](../src/app/page.tsx)
- [src/app/admin/page.tsx](../src/app/admin/page.tsx)
- [src/components/settings/Settings.tsx](../src/components/settings/Settings.tsx)
