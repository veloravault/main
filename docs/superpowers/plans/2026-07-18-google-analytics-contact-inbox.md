# Google Analytics and Contact Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GA4 and Search Console verification, replace the email-only contact page with a secure persisted form, and expose submissions in a dedicated owner-only Contact inbox separate from member Support.

**Architecture:** Root metadata and nonce-aware scripts provide Google integration without weakening the existing CSP. Public contact writes enter through one validated, rate-limited server route and a service-role-only Supabase boundary. Admin list/detail/status operations use a focused repository and `requireAdmin()` APIs, while the client console renders a separate Contact workspace using the established support inbox interaction pattern.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.7, TypeScript, Supabase/Postgres/RLS, Node test runner, CSS Modules, Vercel CLI.

## Global Constraints

- Work directly on `main`; do not create a branch or worktree.
- Preserve the user-owned `.claude/settings.json` modification and never stage it.
- Load GA4 measurement ID `G-GKGJ4QD0E5` globally.
- Publish Google verification token `Ujcj8cwdFNvamMuqMoR_Bhhs2mUTxHctWA4Xhf6sr8k` as `google-site-verification` metadata.
- Do not send vault content, contact message text, credentials, master keys, document names, or payment data to analytics.
- Keep public contact submissions separate from authenticated member support tickets at every layer.
- Do not grant `anon` or `authenticated` direct access to contact submission or rate-limit tables.
- Use failing tests before every production-code change.
- Complete with tests, lint, TypeScript, build, browser QA, GitHub push, and Vercel production deployment.

---

### Task 1: Global Google tag, Search Console verification, and CSP

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/proxy.ts`
- Modify: `src/app/sitemap.ts`
- Create: `tests/google-measurement.test.mjs`

**Interfaces:**
- Consumes: the request nonce from `headers().get("x-csp-nonce")`.
- Produces: root Google verification metadata, one nonce-aware external tag script, one nonce-aware initialization script, and compatible CSP directives.

- [ ] **Step 1: Write the failing measurement contract tests**

Create `tests/google-measurement.test.mjs` that reads the three production files and asserts:

```js
assert.match(layout, /verification:\s*\{\s*google:\s*["']Ujcj8cwdFNvamMuqMoR_Bhhs2mUTxHctWA4Xhf6sr8k["']/);
assert.match(layout, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-GKGJ4QD0E5/);
assert.match(layout, /gtag\(["']config["'],\s*["']G-GKGJ4QD0E5["']\)/);
assert.match(layout, /nonce=\{nonce\}/);
assert.match(proxy, /https:\/\/www\.googletagmanager\.com/);
assert.match(proxy, /https:\/\/www\.google-analytics\.com/);
assert.match(proxy, /https:\/\/\*\.google-analytics\.com/);
assert.match(sitemap, /contact:\s*["']2026-07-18["']/);
```

Also assert that the initializer contains only `js` and `config` calls and no vault/contact field names.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/google-measurement.test.mjs`

Expected: FAIL because Google verification, scripts, CSP origins, and the updated contact date are absent.

- [ ] **Step 3: Implement the root metadata and nonce-aware scripts**

Add to root metadata:

```ts
verification: {
  google: "Ujcj8cwdFNvamMuqMoR_Bhhs2mUTxHctWA4Xhf6sr8k",
},
```

Add a constant initializer:

```ts
const googleTagBootstrap = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-GKGJ4QD0E5');`;
```

Render an async external script for the supplied tag URL and a nonce-bearing inline script using `googleTagBootstrap`. Follow the installed Next.js 16 script and CSP nonce documentation; do not add a duplicate client tracker component.

Update CSP `script-src` and `connect-src` only for the three required Google origins. Update the contact sitemap date to `2026-07-18`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/google-measurement.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the analytics boundary**

```bash
git add src/app/layout.tsx src/proxy.ts src/app/sitemap.ts tests/google-measurement.test.mjs
git commit -m "feat: add Google measurement and verification"
```

### Task 2: Contact validation, schema, rate limiting, and public API

**Files:**
- Create: `src/lib/contact.ts`
- Create: `src/lib/server/contact-repository.ts`
- Create: `src/app/api/contact/route.ts`
- Create: `supabase/migrations/20260718213000_contact_submissions.sql`
- Create: `tests/contact-domain.test.mjs`
- Create: `tests/contact-route-boundaries.test.mjs`

**Interfaces:**
- Produces: `CONTACT_TOPICS`, `validateContactSubmission(input)`, `submitContactMessage(args)`, and `POST /api/contact`.
- Consumes: `assertSameOrigin`, bounded JSON parsing, request metadata, and `createSupabaseAdminClient()`.

- [ ] **Step 1: Write failing domain tests**

Test `validateContactSubmission` with a valid payload and assert the normalized output:

```ts
{
  name: "Ada Lovelace",
  email: "ada@example.com",
  topic: "general",
  subject: "Product question",
  message: "I would like to understand the vault workflow.",
  company: "",
}
```

Add one test per invalid boundary: unknown key, missing field, invalid email, invalid topic, short/long name, subject, and message. Test honeypot preservation so the route can make the no-write decision.

- [ ] **Step 2: Run the domain test and verify RED**

Run: `node --test tests/contact-domain.test.mjs`

Expected: FAIL because `src/lib/contact.ts` does not exist.

- [ ] **Step 3: Implement minimal pure validation**

Create:

```ts
export const CONTACT_TOPICS = ["general", "account", "security", "privacy", "partnership"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];
export type ValidContactSubmission = {
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  company: string;
};
export function validateContactSubmission(input: unknown):
  | { ok: true; value: ValidContactSubmission }
  | { ok: false; field: keyof ValidContactSubmission | "form"; code: "REQUIRED" | "INVALID" | "TOO_SHORT" | "TOO_LONG" };
```

Use exact key allow-listing, trimming, lowercased email, a conservative email pattern, and the specification's length limits.

- [ ] **Step 4: Verify domain tests GREEN**

Run: `node --test tests/contact-domain.test.mjs`

Expected: PASS.

- [ ] **Step 5: Write failing schema and route boundary tests**

Assert that the migration creates `contact_submissions` and `contact_submission_rate_limits`, enables RLS, revokes `anon` and `authenticated`, grants only `service_role`, constrains topics/statuses, and defines an atomic five-per-hour function keyed by `client_hash`.

Assert the route:

- Calls `assertSameOrigin(request)` before persistence.
- Uses the bounded JSON parser with an explicit maximum.
- Calls `validateContactSubmission`.
- Returns `{ ok: true }` without `submitContactMessage` for a filled honeypot.
- Maps validation to 400, rate limiting to 429, same-origin failure to 403, and repository failure to 503.
- Never logs request bodies, names, emails, subjects, or messages.

- [ ] **Step 6: Run boundary tests and verify RED**

Run: `node --test tests/contact-route-boundaries.test.mjs`

Expected: FAIL because the migration, repository, and route are absent.

- [ ] **Step 7: Implement the migration, repository, and route**

The migration creates the specified submission columns and indexes `(status, created_at desc, id desc)`. Add an atomic function:

```sql
public.try_record_contact_submission(
  p_client_hash text,
  p_name text,
  p_email text,
  p_topic text,
  p_subject text,
  p_message text
) returns uuid
```

The function prunes/updates the hashed rate-limit bucket under a row lock, raises SQLSTATE `P0001` with message `CONTACT_RATE_LIMITED` after five stored submissions in one hour, inserts the submission otherwise, and returns its ID. Revoke execution from public/anon/authenticated; grant it to service role.

`submitContactMessage` hashes the trusted client-address string with SHA-256 plus `CONTACT_RATE_LIMIT_SALT`, calls the RPC, maps `CONTACT_RATE_LIMITED` to a typed repository error, and never stores the raw address.

`POST /api/contact` validates origin, body, honeypot, and fields; extracts the platform-forwarded client address conservatively; persists through the repository; and returns stable JSON errors.

- [ ] **Step 8: Verify contact backend GREEN**

Run: `node --test tests/contact-domain.test.mjs tests/contact-route-boundaries.test.mjs tests/request-security.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit the secure public contact backend**

```bash
git add src/lib/contact.ts src/lib/server/contact-repository.ts src/app/api/contact/route.ts supabase/migrations/20260718213000_contact_submissions.sql tests/contact-domain.test.mjs tests/contact-route-boundaries.test.mjs
git commit -m "feat: persist protected contact submissions"
```

### Task 3: Public contact form

**Files:**
- Create: `src/components/contact/ContactForm.tsx`
- Create: `src/components/contact/ContactForm.module.css`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/components/legal/Legal.module.css`
- Create: `tests/contact-ui.test.mjs`

**Interfaces:**
- Consumes: `POST /api/contact` and `CONTACT_TOPICS`.
- Produces: an accessible client form with deterministic success and error states.

- [ ] **Step 1: Write failing public UI contract tests**

Assert the page renders `ContactForm`, preserves all three direct-email channels, removes the claim that no form is needed, and keeps `pageMetadata`. Assert the form has labels/IDs for name, email, topic, subject, message, the hidden `company` honeypot, `aria-live` success, `role="alert"` failure, disabled submission, and `/api/contact` fetch.

- [ ] **Step 2: Run the UI test and verify RED**

Run: `node --test tests/contact-ui.test.mjs`

Expected: FAIL because the form component is absent and the page still rejects using a form.

- [ ] **Step 3: Implement the form and responsive styling**

Use controlled fields and one `submitState` union:

```ts
type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };
```

Submit JSON to `/api/contact` with `Content-Type` and `Accept`. On 400, show a neutral field-check message; on 429, show the retry-later message; on all other failures, preserve field values and show a retry action. On success, clear visible fields and render a confirmation.

Lay out the form as a contained Apple-style panel beside/above the direct channels, use a two-column name/email row only on wide screens, and collapse to one column below 720 px. Ensure input font size stays at least 16 px on mobile.

- [ ] **Step 4: Verify public UI GREEN**

Run: `node --test tests/contact-ui.test.mjs tests/landing-trust.test.mjs tests/landing-integrity.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the contact form**

```bash
git add src/components/contact/ContactForm.tsx src/components/contact/ContactForm.module.css src/app/contact/page.tsx src/components/legal/Legal.module.css tests/contact-ui.test.mjs
git commit -m "feat: add public contact form"
```

### Task 4: Owner-only contact repository and API

**Files:**
- Extend: `src/lib/server/contact-repository.ts`
- Create: `src/app/api/admin/contact/route.ts`
- Create: `src/app/api/admin/contact/[id]/route.ts`
- Create: `tests/admin-contact-routes.test.mjs`

**Interfaces:**
- Produces: `listContactSubmissionsAdmin`, `getContactSubmissionAdmin`, `setContactSubmissionStatusAdmin`, opaque cursor parsing, and the three admin API operations.
- Consumes: `requireAdmin()`, service-role Supabase, UUID validation, and `admin_audit_log`.

- [ ] **Step 1: Write failing repository/API contract tests**

Test exact query allow-lists, duplicate parameter rejection, filters `new|read|resolved|all`, opaque cursor validation, UUID validation, patch body key/status validation, and `requireAdmin()` on every method. Assert service-role repository access, stable DTO field mapping, page size 25, `(created_at,id)` keyset pagination, and audit actions.

- [ ] **Step 2: Run the admin contact route test and verify RED**

Run: `node --test tests/admin-contact-routes.test.mjs`

Expected: FAIL because the routes and repository exports are absent.

- [ ] **Step 3: Implement repository operations and admin routes**

Define:

```ts
export type ContactStatus = "new" | "read" | "resolved";
export type ContactFilter = ContactStatus | "all";
export type AdminContactSubmission = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};
```

List payloads may omit `message`; the detail route returns the complete DTO. PATCH updates `resolved_at` when resolving and clears it when reopening. Record audit events with the admin as actor and no member ID.

- [ ] **Step 4: Verify admin contact backend GREEN**

Run: `node --test tests/admin-contact-routes.test.mjs tests/admin-route-boundaries.test.mjs tests/auth-boundaries.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the admin contact APIs**

```bash
git add src/lib/server/contact-repository.ts src/app/api/admin/contact/route.ts 'src/app/api/admin/contact/[id]/route.ts' tests/admin-contact-routes.test.mjs
git commit -m "feat: add owner contact inbox API"
```

### Task 5: Separate Contact inbox in the owner console

**Files:**
- Create: `src/components/admin/AdminContact.tsx`
- Create: `src/components/admin/AdminContactDetail.tsx`
- Modify: `src/components/admin/AdminConsole.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/types.ts`
- Modify: `src/app/admin/admin.module.css`
- Modify: `tests/admin-ui-integrity.test.mjs`

**Interfaces:**
- Consumes: `/api/admin/contact` list/detail/PATCH APIs.
- Produces: `AdminView = ... | "contact"`, a dedicated sidebar destination, and responsive Contact inbox/detail UI.

- [ ] **Step 1: Extend admin UI tests and verify RED**

Add assertions that:

- `AdminView` includes `contact`.
- `AdminSidebar` contains Contact/Public messages separately from Support/Member tickets.
- `AdminConsole` permits `view=contact`, has a distinct title/description, and renders `AdminContact` only for that view.
- `AdminContact` fetches `/api/admin/contact`, exposes all four filters, and renders `AdminContactDetail`.
- Detail fetch/PATCH targets `/api/admin/contact/:id`, automatically marks New as Read once, offers Mark unread/Mark read/Resolve/Reopen, and constructs a `mailto:` URL.
- CSS defines a desktop split workspace and mobile full-screen detail without horizontal overflow.

Run: `node --test tests/admin-ui-integrity.test.mjs`

Expected: FAIL on the missing Contact view and components.

- [ ] **Step 2: Implement shared contact admin types and navigation**

Add `contact` to view constants and labels, use `MailIcon`, and ensure `selectView` clears contact-specific URL state. Add types matching the API DTOs.

- [ ] **Step 3: Implement the Contact list and detail components**

Follow the stable Support patterns for cancellation, pagination, authentication-expired redirects, loading/empty/error states, and responsive detail presentation. Keep Contact fetches and state fully independent from Support.

Use semantic list/detail regions, accessible status announcements, and buttons that mutate only after successful PATCH. Encode the reply URL with `URLSearchParams` or `encodeURIComponent`; never inject sender content into HTML.

- [ ] **Step 4: Add responsive styling and verify GREEN**

Run: `node --test tests/admin-ui-integrity.test.mjs tests/admin-route-boundaries.test.mjs tests/contact-ui.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the separate owner inbox**

```bash
git add src/components/admin/AdminContact.tsx src/components/admin/AdminContactDetail.tsx src/components/admin/AdminConsole.tsx src/components/admin/AdminSidebar.tsx src/components/admin/types.ts src/app/admin/admin.module.css tests/admin-ui-integrity.test.mjs
git commit -m "feat: add separate admin contact inbox"
```

### Task 6: Full verification, database application, push, and production deployment

**Files:**
- Verify all modified files.
- Do not stage: `.claude/settings.json`.

**Interfaces:**
- Produces: applied Supabase migration, synchronized GitHub `main`, and a verified Vercel production deployment.

- [ ] **Step 1: Run the complete local verification gate**

Run sequentially:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all tests pass, lint exits 0, TypeScript exits 0, and Next production build exits 0.

- [ ] **Step 2: Apply and verify the Supabase migration**

Use the repository's established Supabase CLI project linkage. Inspect migration status first, then apply only the pending contact migration. Verify the remote migration list records `20260718213000` and do not reset or destructively alter existing data.

- [ ] **Step 3: Browser QA the public and admin flows**

At desktop and 390x844:

- Load `/contact`; verify no overflow, labels, direct channels, client validation, success state, and rate-limit message contract.
- Submit one clearly labeled test contact message to the local or controlled production database.
- Sign in as the owner and load `/admin?view=contact`.
- Verify the submission appears only in Contact, not Support.
- Open detail, confirm New to Read, use Reply by email without sending, resolve, reopen, and verify mobile full-screen detail.
- Check browser console for errors.

- [ ] **Step 4: Inspect repository hygiene**

Run:

```bash
git diff --check
git status --short --branch
git log --oneline -8
```

Expected: only `.claude/settings.json` remains modified; all implementation files are committed on `main`.

- [ ] **Step 5: Push and deploy production**

```bash
git push origin main
npx vercel deploy --prod --yes
```

Wait for the deployment to reach Ready and the `veloravault.in` alias to update.

- [ ] **Step 6: Verify the live deployment**

Confirm HTTP 200 for `/`, `/contact`, `/admin`, `/robots.txt`, `/sitemap.xml`, and the Google verification meta tag in the live HTML. Confirm the contact API rejects cross-origin requests and accepts one valid same-origin browser submission. Confirm the Vercel deployment is Production/Ready and `HEAD == origin/main`.
