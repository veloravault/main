# Invite-Only Landing, Approval, and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional Apple-ecosystem landing page and a secure invite-only access system in which the owner approves name-and-email requests before Supabase creates an Auth user.

**Architecture:** Move the existing client vault behind a server-gated `/vault` route, add cookie-aware Supabase SSR clients and a server-only privileged client, and centralize membership/admin authorization in a DAL. Public requests, invitation dispatch, onboarding, and admin operations use bounded Route Handlers backed by an RLS-protected Postgres state machine; the master key remains client-memory-only and separate from the Supabase sign-in password.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.7, TypeScript, Tailwind CSS 4, CSS Modules, Framer Motion 12, Supabase Auth/Postgres/RLS, `@supabase/ssr` 0.12.1, `@supabase/supabase-js` 2.110.3, Node 24 test runner.

## Global Constraints

- Read the relevant files in `node_modules/next/dist/docs/` before changing Next.js APIs; this repository explicitly warns that Next 16 conventions differ.
- Public signup remains disabled; an Auth user is created only by an approved server-side invitation.
- The public request form collects exactly full name and email, plus a non-user-facing honeypot.
- The owner’s immutable Supabase Auth UUID is the only initial admin identity; authorization never uses email or `user_metadata`.
- Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`; accept legacy anon/service-role variables only as temporary migration fallbacks.
- Never expose the Supabase secret/service-role key to a Client Component, browser bundle, URL, log, or `NEXT_PUBLIC_` variable.
- The separate vault master key remains client-memory-only. It is never sent to Supabase Auth, a Route Handler, the waitlist, an email, metadata, analytics, or logs.
- Do not redesign or behaviorally change the existing internal Wallet.
- Use one Apple blue action color, honest security language, reduced-motion alternatives, 44-pixel mobile targets, and the existing shared sheet primitives.
- Preserve unrelated dirty-worktree changes. Stage only files named in the current task.
- Every protected server operation rechecks authorization at the point of use; Proxy performs session refresh and optimistic routing only.
- Do not hold a database transaction or row lock across the external invitation-email call.

---

## File responsibility map

### Data and domain

- Create `invite_access_schema.sql`: tables, constraints, indexes, grants, RLS, membership-gated policies, rate-limit RPC, and existing-member backfill.
- Create `src/lib/access/types.ts`: request/member statuses and public/admin DTOs.
- Create `src/lib/access/validation.ts`: normalization, parsing, redirect allowlisting, cursor parsing, and admin-ID parsing.
- Create `src/lib/access/approval.ts`: invitation state-machine orchestration behind dependency interfaces.
- Create `src/lib/server/access-repository.ts`: privileged Supabase persistence implementation.
- Create `src/lib/server/request-security.ts`: same-origin enforcement, body bounds, HMAC fingerprints, and safe provider error codes.

### Auth and authorization

- Modify `src/lib/supabase.ts`: browser client using publishable-key-first configuration.
- Create `src/lib/server/supabase.ts`: cookie-aware SSR client.
- Create `src/lib/server/supabase-admin.ts`: privileged, non-persistent admin client.
- Create `src/lib/server/access.ts`: `requireUser`, `requireAdmin`, `requireActiveMember`, and bearer-token equivalents.
- Create `src/lib/server/session-proxy.ts` and `src/proxy.ts`: Supabase cookie refresh only.
- Create `src/components/auth/VaultKeyProvider.tsx`: in-memory-only master-key handoff across client navigation.

### Routes and UI

- Move `src/app/page.tsx` to `src/components/VaultApp.tsx`; create server-gated `src/app/vault/page.tsx`.
- Create `src/app/page.tsx` plus `src/components/marketing/*` and `src/app/landing.module.css`.
- Create `src/app/request-access/page.tsx`, `src/components/access/RequestAccessForm.tsx`, and `src/app/api/access-requests/route.ts`.
- Create `src/app/login/page.tsx` and `src/components/auth/SignInForm.tsx`; modify `src/components/Auth.tsx` into the session-only master-key unlock experience.
- Create `src/app/admin/page.tsx`, `src/components/admin/*`, `src/app/admin/admin.module.css`, and admin Route Handlers.
- Create `src/app/accept-invite/page.tsx`, `src/app/auth/confirm/route.ts`, `src/app/onboarding/page.tsx`, `src/components/auth/OnboardingForm.tsx`, and `src/app/api/onboarding/complete/route.ts`.

### Operations and tests

- Modify `env.example.txt`, `README.md`, `next.config.ts`, existing API/actions auth checks, and `tests/project-integrity.test.mjs`.
- Create `docs/invite-only-rollout.md`, `docs/supabase/invite-email.html`, and focused `tests/*.test.mjs` files.

---

### Task 1: Lock the access domain and database contract

**Files:**
- Create: `src/lib/access/types.ts`
- Create: `src/lib/access/validation.ts`
- Create: `invite_access_schema.sql`
- Create: `tests/access-domain.test.mjs`
- Create: `tests/invite-access-schema.test.mjs`

**Interfaces:**
- Produces: `AccessRequestStatus`, `MemberStatus`, `parseAccessRequestInput()`, `parseAdminUserIds()`, `parseInviteCursor()`, `encodeInviteCursor()`, and the four access-control tables.
- Consumes: no feature-specific earlier interfaces.

- [ ] **Step 1: Write failing domain tests**

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeInviteCursor,
  parseAccessRequestInput,
  parseAdminUserIds,
  parseInviteCursor,
  parseSafeNextPath,
} from "../src/lib/access/validation.ts";

test("access requests normalize valid name and email", () => {
  assert.deepEqual(parseAccessRequestInput({ fullName: "  Aarav   Thakur ", email: " AARAV@Example.COM " }), {
    ok: true,
    value: { fullName: "Aarav Thakur", email: "aarav@example.com" },
  });
});

test("access requests reject unexpected or oversized fields", () => {
  assert.equal(parseAccessRequestInput({ fullName: "A", email: "bad" }).ok, false);
  assert.equal(parseAccessRequestInput({ fullName: "Aarav Thakur", email: "a@example.com", role: "admin" }).ok, false);
});

test("admin ids accept only UUIDs", () => {
  assert.deepEqual(parseAdminUserIds("550e8400-e29b-41d4-a716-446655440000, bad"), new Set(["550e8400-e29b-41d4-a716-446655440000"]));
});

test("invite cursor round-trips requestedAt and id", () => {
  const value = { requestedAt: "2026-07-14T00:00:00.000Z", id: "550e8400-e29b-41d4-a716-446655440000" };
  assert.deepEqual(parseInviteCursor(encodeInviteCursor(value)), value);
  assert.equal(parseInviteCursor("not-a-cursor"), null);
});

test("post-login navigation accepts only known internal destinations", () => {
  assert.equal(parseSafeNextPath("/admin"), "/admin");
  assert.equal(parseSafeNextPath("/vault"), "/vault");
  assert.equal(parseSafeNextPath("//evil.example"), "/vault");
  assert.equal(parseSafeNextPath("https://evil.example"), "/vault");
});
```

- [ ] **Step 2: Run the focused tests and confirm the missing-module failure**

Run: `node --test tests/access-domain.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/access/validation.ts`.

- [ ] **Step 3: Implement the domain types and validation functions**

```ts
// src/lib/access/types.ts
export const ACCESS_REQUEST_STATUSES = ["pending", "inviting", "invited", "invite_failed", "active"] as const;
export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];

export const MEMBER_STATUSES = ["invited", "active", "suspended", "revoked"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export type AccessRequestInput = { fullName: string; email: string };
export type InviteCursor = { requestedAt: string; id: string };
export type FieldErrors = Partial<Record<"fullName" | "email" | "form", string>>;
export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

// src/lib/access/validation.ts
import type { AccessRequestInput, InviteCursor, ParseResult } from "./types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAccessRequestInput(input: unknown): ParseResult<AccessRequestInput> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: { form: "Enter your name and email." } };
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["fullName", "email", "website"].includes(key))) return { ok: false, errors: { form: "The request contains unsupported fields." } };
  const fullName = typeof record.fullName === "string" ? record.fullName.trim().replace(/\s+/g, " ") : "";
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const errors: Record<string, string> = {};
  if (fullName.length < 2 || fullName.length > 100) errors.fullName = "Enter a name between 2 and 100 characters.";
  if (email.length > 254 || !EMAIL.test(email)) errors.email = "Enter a valid email address.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { fullName, email } };
}

export function parseAdminUserIds(value = "") {
  return new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter((item) => UUID.test(item)));
}

export function parseSafeNextPath(value: string | null | undefined) {
  return value === "/admin" || value === "/vault" ? value : "/vault";
}

export function encodeInviteCursor(value: InviteCursor) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function parseInviteCursor(value: string | null): InviteCursor | null {
  if (!value || value.length > 512) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as InviteCursor;
    return UUID.test(parsed.id) && !Number.isNaN(Date.parse(parsed.requestedAt)) ? parsed : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Add a failing SQL contract test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(new URL("../invite_access_schema.sql", import.meta.url), "utf8");

test("invite schema creates protected access tables and indexes", () => {
  for (const table of ["access_requests", "app_members", "admin_audit_log", "access_request_rate_limits"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /access_requests[\s\S]+email text not null unique check/i);
  assert.match(sql, /app_members[\s\S]+email text not null unique check/i);
  assert.match(sql, /where status in \('pending', 'invite_failed'\)/i);
  assert.match(sql, /revoke all[^;]+from anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.consume_access_request_rate_limit/i);
});

test("existing vault policies require active membership", () => {
  for (const table of ["vault_items", "vault_documents", "secure_notes", "secure_wallet"]) {
    assert.match(sql, new RegExp(`on public\\.${table}[\\s\\S]+app_members`, "i"));
  }
  assert.match(sql, /storage\.objects[\s\S]+app_members/i);
});
```

- [ ] **Step 5: Create the SQL schema with explicit privileges and short conditional transitions**

Implement `invite_access_schema.sql` with these exact rules:

```sql
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  status text not null default 'pending' check (status in ('pending','inviting','invited','invite_failed','active')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  invite_started_at timestamptz,
  invited_at timestamptz,
  activated_at timestamptz,
  auth_user_id uuid references auth.users(id) on delete set null,
  invite_attempts integer not null default 0 check (invite_attempts >= 0),
  last_error_code text
);
create index if not exists access_requests_pending_idx on public.access_requests (requested_at desc, id desc) where status in ('pending', 'invite_failed');
create index if not exists access_requests_inviting_idx on public.access_requests (invite_started_at, id) where status = 'inviting';

create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(email)),
  status text not null check (status in ('invited','active','suspended','revoked')),
  access_request_id uuid unique references public.access_requests(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  activated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_members_access_request_idx on public.app_members (access_request_id) where access_request_id is not null;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  access_request_id uuid references public.access_requests(id) on delete set null,
  member_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  result_code text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_actor_created_idx on public.admin_audit_log (actor_user_id, created_at desc);
create index if not exists admin_audit_request_created_idx on public.admin_audit_log (access_request_id, created_at desc);

create table if not exists public.access_request_rate_limits (
  fingerprint text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (fingerprint, window_started_at)
);

create or replace function public.consume_access_request_rate_limit(
  p_fingerprint text,
  p_window_started_at timestamptz,
  p_limit integer
) returns boolean
language sql
security invoker
set search_path = ''
as $$
  insert into public.access_request_rate_limits (fingerprint, window_started_at, request_count)
  values (p_fingerprint, p_window_started_at, 1)
  on conflict (fingerprint, window_started_at)
  do update set request_count = public.access_request_rate_limits.request_count + 1
  returning request_count <= p_limit;
$$;

alter table public.access_requests enable row level security;
alter table public.app_members enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.access_request_rate_limits enable row level security;

revoke all on public.access_requests, public.app_members, public.admin_audit_log, public.access_request_rate_limits from anon, authenticated;
grant select on public.app_members to authenticated;
grant select, insert, update, delete on public.access_requests, public.app_members, public.admin_audit_log, public.access_request_rate_limits to service_role;
grant usage, select on sequence public.admin_audit_log_id_seq to service_role;
revoke all on function public.consume_access_request_rate_limit(text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.consume_access_request_rate_limit(text, timestamptz, integer) to service_role;

create policy "Members read their own status" on public.app_members
for select to authenticated
using ((select auth.uid()) = user_id);
```

After the table block, add idempotent `drop policy if exists` / `create policy` replacements using this complete policy matrix:

| Resource | Operation | `USING` | `WITH CHECK` |
|---|---|---|---|
| `vault_items`, `vault_documents`, `secure_notes`, `secure_wallet` | SELECT | `auth.uid() = user_id` and active membership | - |
| same four tables | INSERT | - | `auth.uid() = user_id` and active membership |
| same four tables | UPDATE | `auth.uid() = user_id` and active membership | `auth.uid() = user_id` and active membership |
| same four tables | DELETE | `auth.uid() = user_id` and active membership | - |
| `storage.objects`, bucket `vault_documents` | SELECT | first folder segment equals `auth.uid()` and active membership | - |
| same bucket | INSERT | - | first folder segment equals `auth.uid()` and active membership |
| same bucket | UPDATE | first folder segment equals `auth.uid()` and active membership | first folder segment equals `auth.uid()` and active membership |
| same bucket | DELETE | first folder segment equals `auth.uid()` and active membership | - |
| `storage.objects`, bucket `avatars` | INSERT | - | first folder segment equals `auth.uid()` and active membership |
| same bucket | UPDATE | first folder segment equals `auth.uid()` and active membership | first folder segment equals `auth.uid()` and active membership |
| same bucket | DELETE | first folder segment equals `auth.uid()` and active membership | - |

Preserve the existing public avatar SELECT policy; only avatar writes require membership. Every active-membership predicate is exactly:

```sql
exists (
  select 1 from public.app_members member
  where member.user_id = (select auth.uid())
    and member.status = 'active'
)
```

Finish with an idempotent backfill that inserts confirmed Auth users who already own rows in any existing vault table into `app_members` as `active`, using `on conflict (user_id) do nothing`.

- [ ] **Step 6: Run the focused tests**

Run: `node --test tests/access-domain.test.mjs tests/invite-access-schema.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit only Task 1 files**

```bash
git add invite_access_schema.sql src/lib/access/types.ts src/lib/access/validation.ts tests/access-domain.test.mjs tests/invite-access-schema.test.mjs
git commit -m "feat: define invite access domain and schema"
```

---

### Task 2: Add current Supabase clients, session refresh, and authorization DAL

**Files:**
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/server/auth.ts`
- Create: `src/lib/server/supabase.ts`
- Create: `src/lib/server/supabase-admin.ts`
- Create: `src/lib/server/access.ts`
- Create: `src/lib/server/session-proxy.ts`
- Create: `src/proxy.ts`
- Create: `tests/auth-boundaries.test.mjs`

**Interfaces:**
- Consumes: `parseAdminUserIds()` and `MemberStatus` from Task 1.
- Produces: `createServerSupabaseClient()`, `createSupabaseAdminClient()`, `getMembershipForUser()`, `requireUser()`, `requireAdmin()`, `requireActiveMember()`, `requireActiveMemberForToken()`, and `refreshSupabaseSession()`.

- [ ] **Step 1: Write failing static boundary tests**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("privileged Supabase client is server-only and prefers the secret key", () => {
  const admin = read("src/lib/server/supabase-admin.ts");
  assert.match(admin, /import "server-only"/);
  assert.match(admin, /SUPABASE_SECRET_KEY/);
  assert.match(admin, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(read("src/lib/supabase.ts"), /SECRET_KEY|SERVICE_ROLE/);
});

test("Next 16 uses Proxy only for session refresh", () => {
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /export async function proxy/);
  assert.match(proxy, /refreshSupabaseSession/);
  assert.doesNotMatch(proxy, /app_members|ADMIN_USER_IDS/);
});

test("authorization uses immutable user ids and active membership", () => {
  const access = read("src/lib/server/access.ts");
  assert.match(access, /ADMIN_USER_IDS/);
  assert.match(access, /status[^\n]+active/);
  assert.doesNotMatch(access, /user_metadata/);
});
```

- [ ] **Step 2: Run the boundary tests and confirm missing files fail**

Run: `node --test tests/auth-boundaries.test.mjs`
Expected: FAIL because `src/lib/server/supabase-admin.ts` does not exist.

- [ ] **Step 3: Implement publishable-key-first browser and cookie-aware server clients**

Use `createBrowserClient` in `src/lib/supabase.ts` and `createServerClient` in `src/lib/server/supabase.ts`. Public configuration resolves keys in this order:

```ts
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

The server client must call `const cookieStore = await cookies()` because `cookies()` is asynchronous in Next 16, and its `setAll` adapter must catch the Server Component write restriction while allowing Route Handlers and Proxy to refresh cookies.

- [ ] **Step 4: Implement the isolated privileged client**

```ts
// src/lib/server/supabase-admin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}
```

- [ ] **Step 5: Implement authorization close to the data source**

`src/lib/server/access.ts` must export an `AuthorizationError` carrying `status: 401 | 403` and one of these exact codes: `UNAUTHENTICATED`, `NOT_ADMIN`, `MEMBERSHIP_MISSING`, `MEMBERSHIP_INVITED`, `MEMBERSHIP_SUSPENDED`, or `MEMBERSHIP_REVOKED`. `requireUser()` calls `auth.getUser()`, `requireAdmin()` checks `ADMIN_USER_IDS`, and `getMembershipForUser(userId)` reads only `user_id` and `status` from `app_members`. `requireActiveMember()` composes those helpers and returns only for `active`; `requireActiveMemberForToken()` first validates the bearer token with the public server client, then performs the same membership check with the privileged client. No helper may trust `getSession()`, email, or `user_metadata` for authorization.

- [ ] **Step 6: Implement Proxy as a refresh boundary, not an authorization boundary**

```ts
// src/proxy.ts
import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/server/session-proxy";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 7: Run focused tests, lint, and build**

Run: `node --test tests/auth-boundaries.test.mjs && npm run lint && npm run build`
Expected: all commands exit 0.

- [ ] **Step 8: Commit Task 2 files**

```bash
git add src/lib/supabase.ts src/lib/server/auth.ts src/lib/server/supabase.ts src/lib/server/supabase-admin.ts src/lib/server/access.ts src/lib/server/session-proxy.ts src/proxy.ts tests/auth-boundaries.test.mjs
git commit -m "feat: add Supabase SSR authorization boundaries"
```

---

### Task 3: Move the vault behind `/vault` and separate account sign-in from master-key unlock

**Files:**
- Move: `src/app/page.tsx` to `src/components/VaultApp.tsx`
- Create: `src/app/vault/page.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/components/auth/SignInForm.tsx`
- Create: `src/components/auth/VaultKeyProvider.tsx`
- Modify: `src/components/Auth.tsx`
- Modify: `src/app/layout.tsx`
- Create: `tests/invite-routing.test.mjs`

**Interfaces:**
- Consumes: `requireUser()`, `requireActiveMember()`, and the existing Auth/PIN/biometric helpers.
- Produces: `/login`, `/vault`, `useVaultKey()`, and the reusable `VaultApp` client component.

- [ ] **Step 1: Write failing route and master-key-boundary tests**

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("vault has a server membership gate and a separate client app", () => {
  assert.equal(existsSync(new URL("../src/app/vault/page.tsx", import.meta.url)), true);
  assert.match(read("src/app/vault/page.tsx"), /requireActiveMember/);
  assert.match(read("src/app/vault/page.tsx"), /<VaultApp/);
});

test("login does not create public accounts", () => {
  const login = read("src/components/auth/SignInForm.tsx");
  assert.match(login, /signInWithPassword/);
  assert.doesNotMatch(login, /signUp/);
});

test("master key provider is memory-only", () => {
  const provider = read("src/components/auth/VaultKeyProvider.tsx");
  assert.doesNotMatch(provider, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(provider, /useState<string \| null>/);
});
```

- [ ] **Step 2: Run the tests and confirm route files are missing**

Run: `node --test tests/invite-routing.test.mjs`
Expected: FAIL on the missing `/vault` page and sign-in form.

- [ ] **Step 3: Move the current vault client without redesigning internal screens**

Run: `git mv src/app/page.tsx src/components/VaultApp.tsx`.

Change the moved component’s default function name from `Home` to `VaultApp`, update `aiSearchVault` to import from `@/app/actions`, and replace its local master-password state with `useVaultKey()`. Keep the existing Dashboard, Passwords, Documents, Notes, Wallet, Bank Accounts, Settings, search, importer, and responsive shell JSX unchanged.

- [ ] **Step 4: Add the in-memory vault-key provider and wrap the root layout**

```tsx
"use client";
import { createContext, useContext, useMemo, useState } from "react";

type VaultKeyContextValue = { masterKey: string | null; setMasterKey: (value: string) => void; clearMasterKey: () => void };
const VaultKeyContext = createContext<VaultKeyContextValue | null>(null);

export function VaultKeyProvider({ children }: { children: React.ReactNode }) {
  const [masterKey, setMasterKeyState] = useState<string | null>(null);
  const value = useMemo(() => ({ masterKey, setMasterKey: setMasterKeyState, clearMasterKey: () => setMasterKeyState(null) }), [masterKey]);
  return <VaultKeyContext.Provider value={value}>{children}</VaultKeyContext.Provider>;
}

export function useVaultKey() {
  const value = useContext(VaultKeyContext);
  if (!value) throw new Error("useVaultKey must be used within VaultKeyProvider");
  return value;
}
```

Place `VaultKeyProvider` inside `ThemeProvider` and outside `ToastProvider` in `src/app/layout.tsx`.

- [ ] **Step 5: Create the server-gated vault page**

`src/app/vault/page.tsx` calls `requireActiveMember()` and maps the typed `AuthorizationError.code`: `UNAUTHENTICATED` redirects to `/login?next=/vault`, `MEMBERSHIP_INVITED` redirects to `/onboarding`, and missing/suspended/revoked membership redirects to `/request-access?state=not-approved`. Re-throw unknown errors. Only an active member renders `<VaultApp />`.

- [ ] **Step 6: Create sign-in-only account authentication**

`SignInForm` contains email and sign-in password fields, calls `supabase.auth.signInWithPassword`, passes the query parameter through `parseSafeNextPath()`, and sends authenticated users only to `/vault` or `/admin`. It never accepts or stores the master key and cannot perform an external redirect. Preserve the reset-password link and change its copy to “Reset sign-in password.”

- [ ] **Step 7: Convert `Auth.tsx` into a session-only master-key unlock**

Remove `isSignUp`, the `signUp` branch, and public account-creation copy. When the vault renders this component, the Supabase session already exists; the form asks only for the master key, then preserves the existing optional PIN/biometric setup and invokes `onLogin(masterKey)`.

- [ ] **Step 8: Run route tests and the existing vault regression suite**

Run: `node --test tests/invite-routing.test.mjs tests/project-integrity.test.mjs && npm run lint && npm run build`
Expected: PASS. Update existing integrity assertions from `src/app/page.tsx` to `src/components/VaultApp.tsx` without weakening their Wallet or mobile-shell checks.

- [ ] **Step 9: Commit Task 3 files**

```bash
git add src/components/VaultApp.tsx src/app/vault/page.tsx src/app/login/page.tsx src/components/auth/SignInForm.tsx src/components/auth/VaultKeyProvider.tsx src/components/Auth.tsx src/app/layout.tsx tests/invite-routing.test.mjs tests/project-integrity.test.mjs
git commit -m "feat: separate public login from vault unlock"
```

---

### Task 4: Build the Private Keynote landing page

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/landing.module.css`
- Create: `src/components/marketing/LandingHeader.tsx`
- Create: `src/components/marketing/VaultAperture.tsx`
- Create: `src/components/marketing/ProductScenes.tsx`
- Create: `src/components/marketing/SecurityStory.tsx`
- Create: `src/components/marketing/LandingFooter.tsx`
- Modify: `src/app/layout.tsx`
- Create: `tests/landing-integrity.test.mjs`

**Interfaces:**
- Consumes: `/request-access` and `/login` route contracts.
- Produces: public `/`, `#security`, `#privacy`, and the reduced-motion Vault Aperture.

- [ ] **Step 1: Write the failing landing contract test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("landing tells the approved Private Keynote story", () => {
  const page = read("src/app/page.tsx");
  for (const copy of ["Private by invitation", "Everything important", "Only yours", "Request access", "Already invited? Sign in"]) assert.match(page, new RegExp(copy));
  assert.doesNotMatch(page, /zero knowledge/i);
  assert.match(read("src/components/marketing/VaultAperture.tsx"), /useReducedMotion/);
  assert.match(read("src/app/landing.module.css"), /@media \(prefers-reduced-motion: reduce\)/);
});
```

- [ ] **Step 2: Run the test and confirm the public page is missing**

Run: `node --test tests/landing-integrity.test.mjs`
Expected: FAIL because the new root page does not exist.

- [ ] **Step 3: Implement the public page as a Server Component**

The root page composes `LandingHeader`, hero copy, `VaultAperture`, `ProductScenes`, `SecurityStory`, final CTA, and `LandingFooter`. Use Next `Link` for `/request-access` and `/login`. Export honest metadata: “A private, encrypted home for passwords, documents, notes and financial essentials.”

- [ ] **Step 4: Implement the Vault Aperture with one orchestrated motion sequence**

Use `useReducedMotion()` to render the final composed state immediately when requested. Otherwise animate the password, document, note, and financial surfaces into the sealed center window once, then map scroll progress to the aperture opening. Do not animate layout continuously after the section leaves the viewport.

- [ ] **Step 5: Implement scoped responsive materials**

`landing.module.css` defines white/soft-neutral/deep-graphite materials, one `#0071e3` action color, editorial clamp-based type, hairline separators, and mobile breakpoints at 767 and 430 pixels. Every interactive element has a focus-visible ring and a minimum 44-pixel mobile target.

- [ ] **Step 6: Run the landing test, lint, and build**

Run: `node --test tests/landing-integrity.test.mjs && npm run lint && npm run build`
Expected: PASS with no static generation error.

- [ ] **Step 7: Commit Task 4 files**

```bash
git add src/app/page.tsx src/app/landing.module.css src/components/marketing src/app/layout.tsx tests/landing-integrity.test.mjs
git commit -m "feat: add Private Keynote landing page"
```

---

### Task 5: Implement the enumeration-safe request-access flow

**Files:**
- Create: `src/lib/server/request-security.ts`
- Create: `src/lib/server/access-repository.ts`
- Create: `src/app/api/access-requests/route.ts`
- Create: `src/app/request-access/page.tsx`
- Create: `src/components/access/RequestAccessForm.tsx`
- Create: `src/app/request-access/request-access.module.css`
- Create: `tests/access-request-service.test.mjs`

**Interfaces:**
- Consumes: `parseAccessRequestInput()`, admin client, rate-limit RPC, and `access_requests`.
- Produces: `POST /api/access-requests` and the public request UI.

- [ ] **Step 1: Write failing request-security tests**

Test that `fingerprintAccessRequest()` returns the same HMAC for equivalent normalized emails, changes across window buckets, never contains the raw email/IP, and rejects a missing `ACCESS_REQUEST_HMAC_SECRET`. Test that `readBoundedJson()` rejects non-JSON and bodies over 8 KiB.

- [ ] **Step 2: Run the focused test and confirm missing exports**

Run: `node --test tests/access-request-service.test.mjs`
Expected: FAIL with missing `src/lib/server/request-security.ts`.

- [ ] **Step 3: Implement request security and repository operations**

Use Node `createHmac("sha256", secret)` over `normalizedEmail + "|" + forwardedIp + "|" + windowStart`. Store only the hex digest. Export these exact request-boundary helpers:

```ts
export class RequestSecurityError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

export function requiredAppUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL_NOT_CONFIGURED");
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("APP_URL_INVALID");
  return url.origin;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  let parsedOrigin: string | null = null;
  try {
    parsedOrigin = origin ? new URL(origin).origin : null;
  } catch {
    parsedOrigin = null;
  }
  if (!parsedOrigin || parsedOrigin !== requiredAppUrl()) {
    throw new RequestSecurityError("ORIGIN_MISMATCH", 403);
  }
}
```

`readBoundedJson(request, 8_192)` checks `content-type`, rejects a declared or streamed body above the limit, and parses exactly one JSON object. `fingerprintAccessRequest()` throws `ACCESS_REQUEST_HMAC_SECRET_NOT_CONFIGURED` when the secret is absent.

The repository calls `consume_access_request_rate_limit` with a 15-minute UTC window and a limit of 5, then inserts with `upsert(..., { onConflict: "email", ignoreDuplicates: true })` so existing rows are never overwritten. Add `cleanupExpiredRateLimits(cutoff)` and, after a handled request, invoke it best-effort when the first fingerprint byte is divisible by 32; delete only rows whose `window_started_at` is older than 24 hours, and never fail the public request because cleanup failed.

- [ ] **Step 4: Implement the public Route Handler**

`POST /api/access-requests` must:

1. require `application/json`;
2. reject bodies above 8 KiB;
3. return the generic 202 response immediately for a filled honeypot;
4. validate and normalize input;
5. consume the HMAC-based rate limit;
6. insert only when allowed; and
7. return the same `{ accepted: true }` for new and duplicate emails.

Return 400 only for correctable field errors, 429 for the rate-limit window, and 503 with `{ code: "REQUEST_UNAVAILABLE" }` for infrastructure failure. Never include a database/provider error message.

- [ ] **Step 5: Build the responsive request page**

The form contains labeled full-name and email inputs, the hidden honeypot, one Apple blue submit button, inline field errors, an offline-preserving retry state, and the exact generic success copy from the spec. Use `aria-live="polite"` for completion and `role="alert"` for failures.

- [ ] **Step 6: Run focused tests, lint, and build**

Run: `node --test tests/access-request-service.test.mjs && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit Task 5 files**

```bash
git add src/lib/server/request-security.ts src/lib/server/access-repository.ts src/app/api/access-requests src/app/request-access src/components/access tests/access-request-service.test.mjs
git commit -m "feat: add secure access request flow"
```

---

### Task 6: Implement idempotent approval and admin APIs

**Files:**
- Create: `src/lib/access/approval.ts`
- Modify: `src/lib/server/access-repository.ts`
- Create: `src/lib/server/invitations.ts`
- Create: `src/app/api/admin/access-requests/route.ts`
- Create: `src/app/api/admin/access-requests/[id]/approve/route.ts`
- Create: `src/app/api/admin/access-requests/[id]/retry/route.ts`
- Create: `src/app/api/admin/members/route.ts`
- Create: `src/app/api/admin/members/[id]/route.ts`
- Create: `tests/access-approval.test.mjs`
- Create: `tests/admin-route-boundaries.test.mjs`

**Interfaces:**
- Consumes: `requireAdmin()`, `assertSameOrigin()`, `AccessRequestStatus`, privileged repository, and Supabase `inviteUserByEmail`.
- Produces: `approveAccessRequest(deps, args)`, cursor-paginated admin DTO endpoints, retry, suspend, and revoke.

- [ ] **Step 1: Write approval state-machine tests with fake dependencies**

Cover these exact cases: pending claim sends once and marks invited; a second claim returns `already_processing`; provider failure marks `invite_failed` with a safe code; retry claims `invite_failed`; stale `inviting` reconciles an existing Auth user before a resend; audit recording failure does not turn a successful invitation into a failed invitation.

- [ ] **Step 2: Run tests and confirm `approval.ts` is missing**

Run: `node --test tests/access-approval.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the dependency-driven orchestrator**

```ts
export type InvitationErrorCode = "DELIVERY_FAILED" | "ALREADY_INVITED" | "RATE_LIMITED" | "CONFIGURATION_ERROR";

export type ClaimResult =
  | { kind: "claimed"; request: { id: string; email: string; fullName: string } }
  | { kind: "already_processing" }
  | { kind: "not_found" };

export type AuditEntry = {
  action: "invite";
  resultCode: string;
  requestId: string;
  adminId: string;
  memberUserId?: string;
};

export type ApprovalDependencies = {
  claim: (requestId: string, adminId: string, now: string) => Promise<ClaimResult>;
  reconcile: (email: string) => Promise<{ userId: string } | null>;
  invite: (email: string, fullName: string) => Promise<{ userId: string }>;
  markInvited: (requestId: string, adminId: string, userId: string, now: string) => Promise<void>;
  markFailed: (requestId: string, adminId: string, code: string, now: string) => Promise<void>;
  mapError: (error: unknown) => InvitationErrorCode;
  audit: (entry: AuditEntry) => Promise<void>;
  reportAuditFailure?: (error: unknown) => void;
  now: () => string;
};

export async function approveAccessRequest(deps: ApprovalDependencies, args: { requestId: string; adminId: string }) {
  const now = deps.now();
  const claim = await deps.claim(args.requestId, args.adminId, now);
  if (claim.kind !== "claimed") return claim;

  let result: { kind: "invited"; userId: string } | { kind: "failed"; code: InvitationErrorCode };
  let auditEntry: AuditEntry;
  try {
    const existing = await deps.reconcile(claim.request.email);
    const invited = existing ?? await deps.invite(claim.request.email, claim.request.fullName);
    await deps.markInvited(args.requestId, args.adminId, invited.userId, deps.now());
    result = { kind: "invited", userId: invited.userId };
    auditEntry = { action: "invite", resultCode: existing ? "RECONCILED" : "INVITED", requestId: args.requestId, adminId: args.adminId, memberUserId: invited.userId };
  } catch (error) {
    const code = deps.mapError(error);
    await deps.markFailed(args.requestId, args.adminId, code, deps.now());
    result = { kind: "failed", code };
    auditEntry = { action: "invite", resultCode: code, requestId: args.requestId, adminId: args.adminId };
  }

  try {
    await deps.audit(auditEntry);
  } catch (auditError) {
    deps.reportAuditFailure?.(auditError);
  }
  return result;
}
```

The repository injects the exported `mapInvitationError()` from `src/lib/server/invitations.ts`. The separate audit block is mandatory: an audit insert outage is observable to server logs but cannot overwrite a durable invitation result.

- [ ] **Step 4: Implement atomic repository claims and cursor pagination**

The claim is one conditional `update` filtered by request ID and either `status in ('pending','invite_failed')` or a stale `inviting` lease whose `invite_started_at` is more than 10 minutes old. It sets `inviting`, refreshes `invite_started_at`, sets `reviewed_by`, increments `invite_attempts`, and selects one row. A fresh `inviting` row returns `already_processing`; an unknown ID returns `not_found`. Before any send - including stale-lease recovery - the orchestrator reconciles by canonical email against Auth Admin users so a provider success followed by a persistence outage cannot cause a duplicate invitation. Admin lists use keyset pagination ordered by `(requested_at desc, id desc)` and a 25-row limit; no `offset` or whole-row serialization.

- [ ] **Step 5: Implement the invitation provider**

`src/lib/server/invitations.ts` calls:

```ts
await admin.auth.admin.inviteUserByEmail(email, {
  data: { full_name: fullName },
  redirectTo: `${requiredAppUrl()}/accept-invite`,
});
```

The module exports `mapInvitationError(error: unknown): InvitationErrorCode`, mapping provider errors to `DELIVERY_FAILED`, `ALREADY_INVITED`, `RATE_LIMITED`, or `CONFIGURATION_ERROR`; it never returns raw messages to clients.

- [ ] **Step 6: Implement admin Route Handlers**

Every handler calls `requireAdmin()` first. Mutations call `assertSameOrigin(request)` before reading the body. `GET /api/admin/access-requests` accepts only known status/search/cursor parameters and returns DTOs with name, email, safe status, timestamps, attempts, and safe error code. Member PATCH accepts only `{ status: "suspended" | "revoked" }`.

- [ ] **Step 7: Run state-machine, boundary, lint, and build checks**

Run: `node --test tests/access-approval.test.mjs tests/admin-route-boundaries.test.mjs && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit Task 6 files**

```bash
git add src/lib/access/approval.ts src/lib/server/access-repository.ts src/lib/server/invitations.ts src/app/api/admin tests/access-approval.test.mjs tests/admin-route-boundaries.test.mjs
git commit -m "feat: add idempotent invitation approval APIs"
```

---

### Task 7: Build the responsive owner approval console

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/admin.module.css`
- Create: `src/components/admin/AdminConsole.tsx`
- Create: `src/components/admin/RequestQueue.tsx`
- Create: `src/components/admin/RequestCard.tsx`
- Create: `src/components/admin/ApprovalSheet.tsx`
- Create: `src/components/admin/AdminSidebar.tsx`
- Create: `src/components/admin/AdminSkeleton.tsx`
- Create: `tests/admin-ui-integrity.test.mjs`

**Interfaces:**
- Consumes: admin DTO APIs, `AdaptiveSheet`, `StateView`, and `useToast`.
- Produces: protected `/admin` desktop master-detail and mobile card queue.

- [ ] **Step 1: Write failing admin UI structure tests**

Assert that the server page calls `requireAdmin`, desktop navigation includes Pending/Invited/Members/Activity, mobile rows use request cards, approval uses `AdaptiveSheet`, the UI renders pending-empty/search-empty/invite-failed/sending states, and no component contains a public signup action.

- [ ] **Step 2: Run the focused test and confirm missing UI files**

Run: `node --test tests/admin-ui-integrity.test.mjs`
Expected: FAIL on missing `src/app/admin/page.tsx`.

- [ ] **Step 3: Implement the protected server page**

`src/app/admin/page.tsx` calls `requireAdmin()`. A 401 redirects to `/login?next=/admin`; a 403 renders a calm Unauthorized state without admin data. Pass only the verified admin’s display-safe email to `AdminConsole`.

- [ ] **Step 4: Implement desktop and mobile queue behavior**

Desktop uses a 176–220 pixel sidebar and a keyset-paginated request list. Mobile replaces rows with 44-pixel-target request cards. Search is debounced by 250 ms, filters update the URL, and the next cursor loads without shifting existing rows.

- [ ] **Step 5: Implement safe approval feedback**

Approval opens `ApprovalSheet` with the exact requester name and email. While POST is in progress, only that row shows Sending invitation. Success replaces its state with Invited after the server response; failure stays visible with Retry. Do not add post-send Undo.

- [ ] **Step 6: Implement loading and empty states**

Use row/card-shaped skeletons, `StateView` for pending-empty/search-empty/error, and `aria-live` for request-state changes. Restore focus to the triggering button after the sheet closes.

- [ ] **Step 7: Run focused tests, lint, and build**

Run: `node --test tests/admin-ui-integrity.test.mjs && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit Task 7 files**

```bash
git add src/app/admin src/components/admin tests/admin-ui-integrity.test.mjs
git commit -m "feat: add owner access approval console"
```

---

### Task 8: Implement scanner-safe invitation acceptance and two-key onboarding

**Files:**
- Create: `src/app/accept-invite/page.tsx`
- Create: `src/app/auth/confirm/route.ts`
- Create: `src/app/onboarding/page.tsx`
- Create: `src/app/onboarding/onboarding.module.css`
- Create: `src/components/auth/OnboardingForm.tsx`
- Create: `src/app/api/onboarding/complete/route.ts`
- Modify: `src/lib/server/access-repository.ts`
- Modify: `invite_access_schema.sql`
- Create: `tests/invite-onboarding.test.mjs`

**Interfaces:**
- Consumes: cookie server client, `useVaultKey()`, invited membership, and the access request state machine.
- Produces: scanner-safe invitation GET, explicit verification POST, membership activation, and client-memory master-key handoff.

- [ ] **Step 1: Write failing scanner and master-key-boundary tests**

Assert that `/accept-invite` does not call `verifyOtp`, `/auth/confirm` exports POST but not GET, `verifyOtp` accepts only type `invite`, `OnboardingForm` calls `updateUser({ password })`, the master key is never included in `fetch()` bodies, and `setMasterKey()` occurs only after local confirmation.

- [ ] **Step 2: Run the test and confirm missing route files**

Run: `node --test tests/invite-onboarding.test.mjs`
Expected: FAIL on missing `accept-invite/page.tsx`.

- [ ] **Step 3: Implement the non-consuming invitation landing**

`/accept-invite` is a Next 16 Server Component, so it declares and awaits `searchParams: Promise<{ token_hash?: string; type?: string; state?: string }>`. It validates that `token_hash` is a bounded string and `type` equals `invite`, then renders a form with hidden fields posting to `/auth/confirm`. Its GET performs no Supabase verification. Invalid parameters render the expired/invalid recovery state.

- [ ] **Step 4: Verify the invitation only after explicit POST**

```ts
export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  if (typeof tokenHash !== "string" || tokenHash.length < 20 || tokenHash.length > 2048) return NextResponse.redirect(new URL("/accept-invite?state=invalid", request.url), 303);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
  if (error || !data.user?.email) return NextResponse.redirect(new URL("/accept-invite?state=expired", request.url), 303);
  await reconcileConfirmedInvite({ userId: data.user.id, email: data.user.email });
  return NextResponse.redirect(new URL("/onboarding", request.url), 303);
}
```

Implement `reconcileConfirmedInvite(input: { userId: string; email: string }): Promise<void>` in the privileged repository. It canonicalizes the email, requires exactly one matching `access_requests` row in `inviting`, `invited`, or `invite_failed`, and invokes a service-role-only SQL RPC that transactionally:

1. upserts `app_members(user_id, email, status = 'invited', access_request_id, approved_by)` without demoting an existing `active`, `suspended`, or `revoked` member;
2. updates the matching request to `invited`, sets `auth_user_id` and `invited_at`, and clears `last_error_code`; and
3. returns the reconciled membership status.

Add that RPC to `invite_access_schema.sql`, revoke it from `public`, `anon`, and `authenticated`, and grant execute only to `service_role`. If no eligible request exists, sign out the just-created cookie session and redirect to `/accept-invite?state=invalid` rather than rendering onboarding.

- [ ] **Step 5: Implement onboarding guards and form**

The page redirects active users to `/vault`, unauthenticated users to `/login`, and only renders the form for `invited` members. The form collects sign-in password, master key, and master-key confirmation. It calls `supabase.auth.updateUser({ password })`, then POSTs only `{ completed: true }` to `/api/onboarding/complete`, calls `setMasterKey(masterKey)`, clears local input state, and client-navigates to `/vault`.

- [ ] **Step 6: Implement server-visible activation without pretending to validate the master key**

The completion handler verifies the cookie session, exact same origin, and current `app_members.status = 'invited'`; it calls a service-role-only `activate_invited_member(user_id)` SQL RPC that transactionally updates that membership and matching request to `active`. The handler writes the activation audit best-effort after the durable transition so an audit outage cannot undo activation. Add the RPC and its service-role-only grant to `invite_access_schema.sql`. Its request schema contains no master-key field. A direct caller can only activate their own invited membership and still cannot decrypt vault data without a locally held key.

- [ ] **Step 7: Run focused tests, lint, and build**

Run: `node --test tests/invite-onboarding.test.mjs && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 8: Commit Task 8 files**

```bash
git add src/app/accept-invite src/app/auth/confirm src/app/onboarding src/app/api/onboarding src/components/auth/OnboardingForm.tsx src/lib/server/access-repository.ts invite_access_schema.sql tests/invite-onboarding.test.mjs
git commit -m "feat: add secure invitation onboarding"
```

---

### Task 9: Enforce active membership across existing vault data paths

**Files:**
- Modify: `src/app/actions.ts`
- Modify: `src/app/api/scan/route.ts`
- Modify: `src/app/api/delete-account/route.ts`
- Modify: `src/lib/server/auth.ts`
- Modify: `tests/project-integrity.test.mjs`
- Modify: `invite_access_schema.sql`

**Interfaces:**
- Consumes: `requireActiveMemberForToken()` and membership-gated RLS from Tasks 1–2.
- Produces: consistent active-member enforcement for server-side AI/scan calls and direct Supabase Data API access.

- [ ] **Step 1: Add failing integrity assertions for every protected operation**

Update the test to count all eight protected Server Action guards, require `scan/route.ts` to use active-member authentication, and require membership checks in RLS policies for the four vault tables plus document/avatar write policies.

- [ ] **Step 2: Run the project-integrity test and observe failures**

Run: `node --test tests/project-integrity.test.mjs`
Expected: FAIL because current actions check authentication but not active membership.

- [ ] **Step 3: Replace authenticated-only guards on vault data operations**

In `src/app/actions.ts`, replace all `requireAuthenticatedUser(accessToken)` calls with `requireActiveMemberForToken(accessToken)`. In `scan/route.ts`, use `authenticateActiveMemberRequest(req)`. Keep account deletion authenticated and owner-scoped so a signed-in user can still delete their account, but ensure its UI is only reachable from the active vault.

- [ ] **Step 4: Complete direct-Data-API membership gates**

Verify `invite_access_schema.sql` recreates SELECT/INSERT/UPDATE/DELETE policies for `vault_items`, `vault_documents`, `secure_notes`, and `secure_wallet`, and write policies for the `vault_documents` and `avatars` buckets, with both ownership and active membership. UPDATE policies require both `USING` and `WITH CHECK`.

- [ ] **Step 5: Run full automated verification**

Run: `npm test && npm run lint && npm run build && npm audit --audit-level=high`
Expected: tests pass, lint has zero errors, build succeeds, and audit reports zero high/critical vulnerabilities.

- [ ] **Step 6: Commit Task 9 files**

```bash
git add src/app/actions.ts src/app/api/scan/route.ts src/app/api/delete-account/route.ts src/lib/server/auth.ts tests/project-integrity.test.mjs invite_access_schema.sql
git commit -m "fix: enforce active membership on vault operations"
```

---

### Task 10: Add production configuration, email template, and rollout verification

**Files:**
- Modify: `env.example.txt`
- Modify: `README.md`
- Modify: `next.config.ts`
- Create: `docs/supabase/invite-email.html`
- Create: `docs/invite-only-rollout.md`
- Create: `tests/invite-rollout-docs.test.mjs`

**Interfaces:**
- Consumes: every route/env/schema contract from Tasks 1–9.
- Produces: reproducible hosted Supabase configuration and final release evidence.

- [ ] **Step 1: Write a failing rollout-document contract test**

Assert that the environment template contains `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ADMIN_USER_IDS`, `ACCESS_REQUEST_HMAC_SECRET`, and `APP_URL`; the invite email uses `{{ .TokenHash }}` and `/accept-invite`; and the rollout document includes signup disablement, SMTP, redirect allowlist, SQL order, owner UUID, Data API grants, email tracking disablement, and rollback.

- [ ] **Step 2: Run the test and confirm documentation is missing**

Run: `node --test tests/invite-rollout-docs.test.mjs`
Expected: FAIL on missing invite email and rollout guide.

- [ ] **Step 3: Update the environment contract**

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=legacy_fallback_only
SUPABASE_SECRET_KEY=your_server_secret_key_here
SUPABASE_SERVICE_ROLE_KEY=legacy_fallback_only
ADMIN_USER_IDS=your_owner_auth_uuid
ACCESS_REQUEST_HMAC_SECRET=generate_at_least_32_random_bytes
APP_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 4: Create the branded scanner-safe invitation template**

Use restrained, authentication-only copy with one button:

```html
<h2>Your Velora Vault invitation is ready</h2>
<p>Use the secure button below to finish setting up your account.</p>
<p><a href="{{ .SiteURL }}/accept-invite?token_hash={{ .TokenHash }}&type=invite">Accept invitation</a></p>
<p>If you did not expect this invitation, you can ignore this email.</p>
```

Do not insert requester name, marketing copy, multiple links, remote tracking images, or the master key.

- [ ] **Step 5: Write the hosted rollout and rollback runbook**

`docs/invite-only-rollout.md` must require, in order:

1. database backup;
2. apply existing pending `security_hardening.sql` if not already applied;
3. apply `invite_access_schema.sql`;
4. verify explicit Data API grants and RLS with anon/authenticated/secret clients;
5. confirm owner backfill and set `ADMIN_USER_IDS` from the immutable Auth UUID;
6. configure publishable/secret keys and deploy environment variables;
7. configure Site URL and exact local/production redirect allowlist;
8. install the invite template and disable email tracking;
9. configure production custom SMTP, SPF, DKIM, and DMARC;
10. disable public email signup;
11. send one controlled invitation and complete onboarding;
12. verify anonymous signup, non-admin admin access, and invited-but-incomplete vault access all fail;
13. retire legacy anon/service-role variables only after successful production verification.

Rollback must re-enable the prior root vault route only if no new invitations have been accepted; after activation data exists, rollback preserves `app_members` and request tables and disables new approvals rather than deleting membership state.

- [ ] **Step 6: Tighten auth-page response headers**

Extend `next.config.ts` headers so `/accept-invite` and `/auth/confirm` receive `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `X-Robots-Tag: noindex, nofollow`, while preserving existing global security headers.

- [ ] **Step 7: Run every automated gate**

Run: `npm test && npm run lint && npm run build && npm audit --audit-level=high && git diff --check`
Expected: all commands exit 0 with no high/critical audit findings and no whitespace errors.

- [ ] **Step 8: Perform local browser verification**

Start the app with `npm run dev`. Using an authenticated browser session and responsive widths 1440, 1024, 768, 430, 375, and 320 pixels, verify:

- landing navigation, Vault Aperture, product scenes, honest security copy, light/dark/reduced-motion;
- request validation, generic success, duplicate submission, offline preservation, and keyboard focus;
- sign-in-only login and master-key-only vault unlock;
- admin pending/empty/search/approve/failure/retry states and non-admin denial;
- invitation GET does not consume the token, explicit acceptance establishes the session, expired links recover cleanly;
- onboarding never sends the master key in Network requests and enters `/vault` without persistence;
- existing vault, search, importer, settings, mobile navigation, and Wallet remain visually and behaviorally unchanged;
- zero unexpected console errors on principal flows.

- [ ] **Step 9: Perform hosted Supabase verification after operator configuration**

Run the SQL assertions from the rollout guide against the hosted project, send one real invitation through custom SMTP, complete it in a private browser profile, confirm `access_requests.status = 'active'` and `app_members.status = 'active'`, then verify a revoked test member receives RLS denials for direct Data API reads.

- [ ] **Step 10: Commit documentation and final verification changes**

```bash
git add env.example.txt README.md next.config.ts docs/supabase/invite-email.html docs/invite-only-rollout.md tests/invite-rollout-docs.test.mjs
git commit -m "docs: add invite-only production rollout"
```

---

## Final release checklist

- [ ] `npm test` passes.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run build` passes.
- [ ] `npm audit --audit-level=high` reports no high or critical vulnerabilities.
- [ ] `git diff --check` passes.
- [ ] Supabase SQL and RLS checks pass with anon, authenticated member, revoked member, and privileged clients.
- [ ] Production custom SMTP delivers the branded invitation.
- [ ] Public signup is disabled.
- [ ] Owner UUID is the only configured admin.
- [ ] Invitation prefetch does not consume the token.
- [ ] The master key is absent from network requests, storage, logs, Auth metadata, waitlist rows, and audit rows.
- [ ] Desktop/mobile/light/dark/reduced-motion browser review passes.
- [ ] Existing Wallet regression review passes unchanged.
