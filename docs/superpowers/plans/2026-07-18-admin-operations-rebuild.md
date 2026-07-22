# Admin Operations Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair owner-console mutations and the production build, then add a responsive safety-first Overview, member operations surface, support inbox, and filterable audit record directly on `main`.

**Architecture:** Preserve the server-rendered `requireAdmin` gate, owner-only route handlers, service-role repositories, narrow DTOs, and server-confirmed client state. Add one focused API/repository boundary per view, keep billing read-only, and use existing membership/RLS enforcement instead of exposing decrypted vault data or creating a second authorization system.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.7, TypeScript, Supabase JS 2.110.3, PostgreSQL/RLS, CSS Modules, Node test runner, ESLint, and authenticated in-app browser verification.

## Global Constraints

- Work directly on `main`; do not create a branch or worktree.
- Preserve unrelated dirty working-tree changes and stage only files named by the current task.
- Read relevant Next.js 16 guides under `node_modules/next/dist/docs/` before changing App Router boundaries.
- Follow red-green TDD: every production behavior needs a failing test observed first.
- Keep manual plan mutation, Razorpay mutation, permanent account deletion, decrypted vault data, document contents, tokens, cookies, and secrets out of admin DTOs.
- Every mutation must call `requireAdmin`, enforce same-origin before body parsing, bound and validate its body, apply state only after server confirmation, and write a sanitized audit result.
- Trust the configured `APP_URL` plus the normalized actual request origin; hostile, missing, malformed, and mismatched origins stay rejected unless a valid same-origin Referer exists.
- “Block access” is the immediate application control; do not claim already-issued access JWTs are instantly revoked.
- Target 320x568, 400x921, 768x1024, and 1440x900 with no horizontal document overflow.

## File Map

**Create:**

- `src/lib/server/admin-overview-repository.ts` - owner-safe aggregate metrics.
- `src/app/api/admin/overview/route.ts` - owner-only Overview endpoint.
- `src/components/admin/AdminOverview.tsx` - Overview cards and recent activity.
- `src/lib/server/member-operations.ts` - member usage DTO and setup-email operation.
- `src/app/api/admin/members/[id]/setup-email/route.ts` - resend setup email.
- `src/components/admin/AdminMemberDetail.tsx` - desktop drawer/mobile sheet.
- `src/components/admin/AdminSupportThread.tsx` - responsive ticket thread.
- `src/components/auth/ResetPasswordClient.tsx` - reset client leaf.
- `tests/request-security.test.mjs` - trusted-origin runtime tests.

**Modify:** `src/lib/server/request-security.ts`, `src/app/reset-password/page.tsx`, `src/lib/server/access-repository.ts`, `src/lib/server/support-repository.ts`, admin API routes, admin types/components/CSS, and admin/project tests.

---

### Task 1: Repair trusted same-origin admin mutations

**Files:**
- Create: `tests/request-security.test.mjs`
- Modify: `src/lib/server/request-security.ts`
- Test: `tests/admin-route-boundaries.test.mjs`

**Interfaces:**
- Consumes: canonical `APP_URL` and `Request.url`.
- Produces: `trustedRequestOrigins(request: Request): ReadonlySet<string>` and unchanged `assertSameOrigin(request: Request): void`.

- [ ] **Step 1: Write failing origin tests**

```js
test("accepts canonical and actual request origins but rejects hostile origins", () => {
  process.env.APP_URL = "https://veloravault.in";
  assert.doesNotThrow(() => assertSameOrigin(new Request("http://localhost:3000/api/admin/x", { headers: { origin: "http://localhost:3000" } })));
  assert.doesNotThrow(() => assertSameOrigin(new Request("https://preview.example/api/admin/x", { headers: { origin: "https://preview.example" } })));
  assert.doesNotThrow(() => assertSameOrigin(new Request("https://veloravault.in/api/admin/x", { headers: { origin: "https://veloravault.in" } })));
  assert.doesNotThrow(() => assertSameOrigin(new Request("http://localhost:3000/api/admin/x", { headers: { origin: "null", referer: "http://localhost:3000/admin" } })));
  assert.throws(() => assertSameOrigin(new Request("https://veloravault.in/api/admin/x", { headers: { origin: "https://evil.example" } })), /ORIGIN_MISMATCH/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/request-security.test.mjs tests/admin-route-boundaries.test.mjs`  
Expected: localhost/request-host assertions fail because only `APP_URL` is trusted.

- [ ] **Step 3: Implement normalized trusted origins**

```ts
function normalizedOrigin(value: string | null) {
  if (!value || value === "null") return null;
  try { return new URL(value).origin; } catch { return null; }
}
export function trustedRequestOrigins(request: Request): ReadonlySet<string> {
  return new Set([requiredAppUrl(), new URL(request.url).origin]);
}
export function assertSameOrigin(request: Request) {
  const trusted = trustedRequestOrigins(request);
  const origin = normalizedOrigin(request.headers.get("origin"));
  if (origin && trusted.has(origin)) return;
  const referer = normalizedOrigin(request.headers.get("referer"));
  if (referer && trusted.has(referer)) return;
  throw new RequestSecurityError("ORIGIN_MISMATCH", 403);
}
```

- [ ] **Step 4: Verify GREEN and the real reply route**

Run: `node --test tests/request-security.test.mjs tests/admin-route-boundaries.test.mjs`. Expected: PASS.  
Browser: send one labeled reply to the owner’s existing ticket; confirm HTTP 200, one persisted message, cleared draft, and refreshed summary.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/request-security.ts tests/request-security.test.mjs tests/admin-route-boundaries.test.mjs
git commit -m "fix: allow trusted admin mutation origins"
```

### Task 2: Repair the public-shell server/client build boundary

**Files:**
- Create: `src/components/auth/ResetPasswordClient.tsx`
- Modify: `src/app/reset-password/page.tsx`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Produces: `ResetPasswordClient(): JSX.Element`; reset `page.tsx` stays a Server Component above `PublicPageShell`.

- [ ] **Step 1: Add a failing boundary test**

```js
test("reset password keeps the server shell above a client leaf", () => {
  const page = read("src/app/reset-password/page.tsx");
  const client = read("src/components/auth/ResetPasswordClient.tsx");
  assert.doesNotMatch(page, /^"use client"/);
  assert.match(page, /<PublicPageShell>[\s\S]*<ResetPasswordClient/);
  assert.match(client, /^"use client"/);
  assert.doesNotMatch(client, /@\/lib\/server\//);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test --test-name-pattern="reset password keeps" tests/project-integrity.test.mjs`  
Expected: FAIL because the reset page is the client boundary importing the server shell.

- [ ] **Step 3: Move reset hooks/forms into the client leaf**

```tsx
// src/app/reset-password/page.tsx
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { ResetPasswordClient } from "@/components/auth/ResetPasswordClient";
export default function ResetPasswordPage() {
  return <PublicPageShell><ResetPasswordClient /></PublicPageShell>;
}
```

Preserve exact reset copy, hash/query behavior, validation, and submission; move only client state/effects into `ResetPasswordClient`.

- [ ] **Step 4: Verify GREEN and build**

Run: `node --test --test-name-pattern="reset password keeps|public authentication" tests/project-integrity.test.mjs tests/auth-ui-restoration.test.mjs`. Expected: PASS.  
Run: `npm run build`. Expected: no client import trace into `src/lib/server/*`.

- [ ] **Step 5: Commit**

```bash
git add src/app/reset-password/page.tsx src/components/auth/ResetPasswordClient.tsx tests/project-integrity.test.mjs
git commit -m "fix: isolate reset password client boundary"
```

### Task 3: Add owner Overview metrics

**Files:**
- Create: `src/lib/server/admin-overview-repository.ts`
- Create: `src/app/api/admin/overview/route.ts`
- Create: `src/components/admin/AdminOverview.tsx`
- Modify: `src/components/admin/types.ts`
- Modify: `src/components/admin/AdminConsole.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/app/admin/admin.module.css`
- Test: `tests/admin-route-boundaries.test.mjs`
- Test: `tests/admin-ui-integrity.test.mjs`

**Interfaces:**
- Produces: `AdminOverviewDto`, `getAdminOverview()`, and `GET /api/admin/overview`.

- [ ] **Step 1: Add failing API/type/UI tests**

```js
assert.match(route, /await requireAdmin\(\)/);
assert.match(route, /getAdminOverview/);
for (const key of ["active", "invited", "suspended", "revoked", "free", "plus", "needsReply", "documentBytes", "aiEvents"]) assert.match(types, new RegExp(key));
assert.match(consoleSource, /<AdminOverview/);
assert.match(sidebar, /id: "overview"/);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/admin-route-boundaries.test.mjs tests/admin-ui-integrity.test.mjs`. Expected: missing Overview route/type/component failures.

- [ ] **Step 3: Implement narrow aggregate DTO and repository**

```ts
export type AdminOverviewDto = {
  members: { total: number; invited: number; active: number; suspended: number; revoked: number };
  plans: { free: number; plus: number };
  support: { open: number; needsReply: number; resolved: number };
  usage: { documentBytes: number; aiEvents: number };
  recentActivity: AdminActivityItem[];
};
```

Use exact head-count queries, select only `vault_documents.size_bytes` for summing, count current-month `ai_usage_events`, and reuse sanitized recent activity. Never select ciphertext, document contents, ticket message bodies, tokens, or metadata payloads.

- [ ] **Step 4: Add route, cards, navigation, and responsive styles**

The route authorizes before repository work. Cards navigate to filtered Members/Support/Activity. CSS uses four desktop, two tablet, and one mobile column with 44px targets and stable loading/error states.

- [ ] **Step 5: Verify and commit**

Run tests and `npx eslint` on created/modified TS files. Browser-check Overview at all four target widths.

```bash
git add src/lib/server/admin-overview-repository.ts src/app/api/admin/overview/route.ts src/components/admin/AdminOverview.tsx src/components/admin/types.ts src/components/admin/AdminConsole.tsx src/components/admin/AdminSidebar.tsx src/app/admin/admin.module.css tests/admin-route-boundaries.test.mjs tests/admin-ui-integrity.test.mjs
git commit -m "feat: add admin operations overview"
```

### Task 4: Add member detail, usage, and setup-email operations

**Files:**
- Create: `src/lib/server/member-operations.ts`
- Create: `src/app/api/admin/members/[id]/setup-email/route.ts`
- Create: `src/components/admin/AdminMemberDetail.tsx`
- Modify: `src/app/api/admin/members/[id]/route.ts`
- Modify: `src/components/admin/types.ts`
- Modify: `src/components/admin/AdminConsole.tsx`
- Modify: `src/app/admin/admin.module.css`
- Test: `tests/admin-route-boundaries.test.mjs`
- Test: `tests/admin-ui-integrity.test.mjs`

**Interfaces:**
- Produces: `AdminMemberDetailDto`, `getMemberDetailAdmin(memberId)`, `sendMemberSetupEmailAdmin({ adminId, memberId })`, member GET, and setup-email POST.

- [ ] **Step 1: Add failing detail/self-protection/resend tests**

```js
assert.match(memberRoute, /export async function GET/);
assert.match(memberRoute, /getMemberDetailAdmin/);
assert.match(setupRoute, /await requireAdmin\(\)[\s\S]*assertSameOrigin\(request\)/);
assert.match(setupRoute, /sendMemberSetupEmailAdmin/);
assert.match(consoleSource, /AdminMemberDetail/);
```

- [ ] **Step 2: Verify RED**

Run admin route/UI tests. Expected: missing detail endpoint/component/setup-email route failures.

- [ ] **Step 3: Implement owner-safe usage DTO**

```ts
export type AdminMemberUsage = {
  documentBytes: number; documents: number; aiEventsThisMonth: number;
  passwords: number; notes: number; walletRecords: number;
  bankAccounts: number; supportTickets: number;
};
export type AdminMemberDetailDto = AdminMember & { usage: AdminMemberUsage; isOwner: boolean };
```

Use exact counts scoped by `user_id`, sum only document sizes, and derive owner identity from configured owner IDs rather than user metadata.

- [ ] **Step 4: Implement validated GET and setup-email POST**

GET validates UUID after `requireAdmin`. POST authorizes, checks same-origin, accepts only an empty bounded JSON object, rejects owner/self and non-invited members, sends a Supabase OTP setup email to `${APP_URL}/onboarding`, and writes `setup_email_resent` audit only after delivery succeeds. Return stable 400/404/409/429/503 codes.

- [ ] **Step 5: Build responsive member detail UI**

Rows select a member. Render a desktop right drawer and mobile bottom sheet with read-only plan/usage, confirmation-gated restore/block/revoke, setup-email resend, inline errors, authoritative refresh, and no self-status actions.

- [ ] **Step 6: Verify and commit**

Run route/UI tests; browser-check owner and non-owner detail at all target widths without sending email or changing a member unless the user confirms the target.

```bash
git add src/lib/server/member-operations.ts src/app/api/admin/members/[id]/route.ts src/app/api/admin/members/[id]/setup-email/route.ts src/components/admin/AdminMemberDetail.tsx src/components/admin/types.ts src/components/admin/AdminConsole.tsx src/app/admin/admin.module.css tests/admin-route-boundaries.test.mjs tests/admin-ui-integrity.test.mjs
git commit -m "feat: add safe admin member operations"
```

### Task 5: Rebuild support as a reliable inbox

**Files:**
- Create: `src/components/admin/AdminSupportThread.tsx`
- Modify: `src/lib/server/support-repository.ts`
- Modify: `src/app/api/admin/support/route.ts`
- Modify: `src/app/api/admin/support/[id]/route.ts`
- Modify: `src/app/api/admin/support/[id]/messages/route.ts`
- Modify: `src/components/admin/AdminSupport.tsx`
- Modify: `src/components/admin/types.ts`
- Modify: `src/app/admin/admin.module.css`
- Test: `tests/admin-route-boundaries.test.mjs`
- Test: `tests/admin-ui-integrity.test.mjs`

**Interfaces:**
- Produces: `TicketFilter = "open" | "needs_reply" | "resolved" | "all"`, filter-aware support listing, stable mutation errors, and a responsive thread workspace.

- [ ] **Step 1: Add failing filter, thread, and mutation-state tests**

```js
for (const filter of ["open", "needs_reply", "resolved", "all"]) assert.match(supportSource, new RegExp(filter));
assert.match(supportSource, /AdminSupportThread/);
assert.match(threadSource, /sending/);
assert.match(threadSource, /draft/);
assert.match(threadSource, /aria-live/);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/admin-route-boundaries.test.mjs tests/admin-ui-integrity.test.mjs`. Expected: missing inbox filter/thread behavior failures.

- [ ] **Step 3: Implement filter-aware repository and routes**

Map `needs_reply` to open tickets whose last message is from a member. Validate query values, keep DTOs narrow, require admin before repository work, and retain same-origin checks for replies and status mutations. Return stable error codes and never echo provider errors or message bodies.

- [ ] **Step 4: Build desktop split pane and mobile full-screen thread**

Preserve reply drafts on failure, disable duplicate sends, expose inline actionable errors plus retry, auto-scroll only when appropriate, and refresh authoritative state after reply/resolve/reopen. Keep focus management, Escape/back behavior, and 44px touch targets.

- [ ] **Step 5: Verify real delivery and lifecycle**

Using the authenticated owner session, send one clearly labeled test reply to the existing test ticket, confirm it persists after reload, resolve it, reopen it, and confirm member-visible ordering. Do not send any other messages.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/support-repository.ts src/app/api/admin/support/route.ts src/app/api/admin/support/[id]/route.ts src/app/api/admin/support/[id]/messages/route.ts src/components/admin/AdminSupport.tsx src/components/admin/AdminSupportThread.tsx src/components/admin/types.ts src/app/admin/admin.module.css tests/admin-route-boundaries.test.mjs tests/admin-ui-integrity.test.mjs
git commit -m "feat: rebuild admin support inbox"
```

### Task 6: Add useful activity filters

**Files:**
- Modify: `src/lib/server/admin-repository.ts`
- Modify: `src/app/api/admin/activity/route.ts`
- Modify: `src/components/admin/AdminActivity.tsx`
- Modify: `src/components/admin/types.ts`
- Modify: `src/app/admin/admin.module.css`
- Test: `tests/admin-route-boundaries.test.mjs`
- Test: `tests/admin-ui-integrity.test.mjs`

**Interfaces:**
- Produces: category filters `all | access | support | invitation | system` and result filters `all | success | failure`.

- [ ] **Step 1: Add failing query-validation and UI tests**

Assert supported filters, bounded pagination, invalid-query rejection, filter controls, and loading/empty/error states.

- [ ] **Step 2: Verify RED**

Run the focused admin tests. Expected: filter assertions fail.

- [ ] **Step 3: Implement filtered repository, route, and UI**

Map categories to an allowlist of audit action prefixes, map result from sanitized audit fields, preserve existing DTO redaction, reset pagination on filter change, and synchronize filters with the admin view state without leaking raw audit metadata.

- [ ] **Step 4: Verify and commit**

Run focused tests and browser-check each filter combination with URL navigation/back-forward behavior.

```bash
git add src/lib/server/admin-repository.ts src/app/api/admin/activity/route.ts src/components/admin/AdminActivity.tsx src/components/admin/types.ts src/app/admin/admin.module.css tests/admin-route-boundaries.test.mjs tests/admin-ui-integrity.test.mjs
git commit -m "feat: add admin activity filters"
```

### Task 7: Consolidate the responsive admin shell

**Files:**
- Modify: `src/components/admin/AdminConsole.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminMembers.tsx`
- Modify: `src/components/admin/AdminSupport.tsx`
- Modify: `src/components/admin/AdminActivity.tsx`
- Modify: `src/app/admin/admin.module.css`
- Test: `tests/admin-ui-integrity.test.mjs`

- [ ] **Step 1: Add failing shell invariants**

Cover compact mobile headings, visible current navigation, 44px controls, bounded drawers/dialogs, wrapping action groups, no fixed content widths, and explicit loading/empty/error states.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/admin-ui-integrity.test.mjs`. Expected: new responsive invariants fail.

- [ ] **Step 3: Implement shared responsive behavior**

Use the same information architecture at 320, 400, 768, and 1440 widths. Keep desktop sidebar and mobile navigation stable, avoid horizontal overflow, keep one primary action per surface, and ensure detail/support overlays respect safe areas and the visible viewport.

- [ ] **Step 4: Browser matrix and commit**

At every target width, click Overview cards, member rows/actions, support filters/thread/status/reply, activity filters/pagination, navigation, close/back controls, and keyboard focus paths. Capture screenshots only for regressions that need comparison.

```bash
git add src/components/admin/AdminConsole.tsx src/components/admin/AdminSidebar.tsx src/components/admin/AdminMembers.tsx src/components/admin/AdminSupport.tsx src/components/admin/AdminActivity.tsx src/app/admin/admin.module.css tests/admin-ui-integrity.test.mjs
git commit -m "fix: harden responsive admin layout"
```

### Task 8: Run the full release gate and audit the result

**Files:**
- Modify only files required by failures attributable to this plan.

- [ ] **Step 1: Run automated verification**

```bash
npm test
npm run lint
git diff --check
npm run build
```

All commands must exit zero. Diagnose failures before changing code; do not weaken assertions or skip checks.

- [ ] **Step 2: Run authenticated end-to-end click-through**

Verify owner access, non-admin rejection where practical, every admin navigation item, Overview deep links, member detail and guarded mutations, the single approved support test reply plus resolve/reopen, activity filters, reload persistence, back/forward navigation, and 320/400/768/1440 responsive behavior.

- [ ] **Step 3: Perform security and privacy review**

Confirm all admin routes authorize before data access, all mutations enforce same-origin and bounded input, no service-role credential enters the client bundle, self/owner mutation guards hold, errors are sanitized, and admin DTOs never expose secrets, ciphertext, document contents, ticket bodies outside the selected thread, tokens, or raw audit metadata.

- [ ] **Step 4: Audit git scope and hand off**

Review `git status --short`, `git diff --stat`, and task-file diffs. Preserve unrelated user changes. Report exact verification evidence, any intentional operational limitation, and commits created on `main`.
