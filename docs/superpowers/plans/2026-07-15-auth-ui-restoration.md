# Auth UI Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the July 13 compact Apple-style sign-in/sign-up presentation while mapping its second mode to the current invite-only Request Access flow and preserving every current security boundary.

**Architecture:** Add a client-side shared authentication shell that owns only presentation, theme switching, segmented navigation, and motion. Keep `SignInForm`, `RequestAccessForm`, invitation confirmation, onboarding, password reset, and private master-key unlock as separate behavior owners; compose their existing behavior into the shell instead of reviving the historical combined authentication handler.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.7, TypeScript, CSS Modules, Tailwind CSS 4 tokens, Framer Motion 12, next-themes, Supabase Auth.

## Global Constraints

- Public self-registration remains disabled.
- The second segment is **Request Access**, not unrestricted account creation.
- Request Access collects only name and email; its hidden honeypot remains anti-abuse metadata.
- Sign-in password and vault master key remain separate secrets.
- The sign-in screen must never request or submit the master key.
- The master key remains local and in memory and must not be sent to Supabase, API routes, logs, analytics, cookies, local storage, or session storage.
- Existing invitation validation, onboarding, membership checks, RLS, password reset, and safe redirect validation remain unchanged.
- Preserve the untracked diagnostic files and `docs/project-context-2026-07-15.md` already present in the working tree.
- Follow the installed Next.js 16 guidance: pages remain Server Components by default; interactive state stays in narrow Client Component boundaries; CSS Modules provide scoped route-independent styles.

## File Structure

- Create `src/components/auth/AuthShell.tsx`: shared presentational shell, theme toggle, optional segmented control, and motion boundary.
- Create `src/components/auth/auth-shell.module.css`: all public-auth layout, grouped-field, responsive, dark-theme, focus, and reduced-motion styles.
- Create `src/components/auth/AuthGateway.tsx`: owns only the Sign In / Request Access display mode and composes the two existing forms.
- Modify `src/components/auth/SignInForm.tsx`: preserve Supabase behavior while returning shell-compatible form content.
- Modify `src/components/access/RequestAccessForm.tsx`: preserve request API behavior while adopting shared grouped-field classes.
- Modify `src/app/login/page.tsx`: render the gateway in Sign In mode.
- Modify `src/app/request-access/page.tsx`: render the same gateway in Request Access mode.
- Delete `src/app/request-access/request-access.module.css`: replace the standalone split-page visual system with the shared auth shell.
- Modify `src/app/accept-invite/page.tsx`, `src/app/onboarding/page.tsx`, `src/components/auth/OnboardingForm.tsx`, and `src/app/reset-password/page.tsx`: adopt the shared presentation without changing route logic.
- Modify `src/app/onboarding/onboarding.module.css`: retain only onboarding-specific guide and form details that are not supplied by the shell.
- Create `tests/auth-ui-restoration.test.mjs`: lock presentation/behavior separation and prevent public signup or master-key regression.

---

### Task 1: Shared Apple Authentication Shell

**Files:**
- Create: `src/components/auth/AuthShell.tsx`
- Create: `src/components/auth/auth-shell.module.css`
- Create: `tests/auth-ui-restoration.test.mjs`

**Interfaces:**
- Produces: `AuthMode = "sign-in" | "request-access"`.
- Produces: `AuthShell({ title, description, eyebrow, mode, onModeChange, children, footer, compact })`.
- Consumes: `useTheme()` from `next-themes`, `AnimatePresence` and `motion` from `framer-motion`, and the existing `AppleLockIcon`.

- [ ] **Step 1: Write the failing structural test**

Create `tests/auth-ui-restoration.test.mjs` with assertions that the shared shell does not import Supabase, exposes both approved modes, includes a theme toggle, uses reduced-motion-compatible motion, and has responsive safe-area CSS:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("shared auth shell owns presentation without authentication", () => {
  const shell = read("src/components/auth/AuthShell.tsx");
  const css = read("src/components/auth/auth-shell.module.css");
  assert.match(shell, /export type AuthMode = "sign-in" \| "request-access"/);
  assert.match(shell, /Sign In/);
  assert.match(shell, /Request Access/);
  assert.match(shell, /useTheme/);
  assert.match(shell, /AnimatePresence/);
  assert.doesNotMatch(shell, /supabase|signInWithPassword|signUp|masterKey|masterPassword/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
```

- [ ] **Step 2: Run the test and confirm the missing shell fails**

Run: `node --test tests/auth-ui-restoration.test.mjs`

Expected: FAIL because `src/components/auth/AuthShell.tsx` does not exist.

- [ ] **Step 3: Implement the presentation-only shell**

Create `AuthShell.tsx` as a narrow Client Component. The segmented control must use buttons with `aria-pressed`, the theme control must use `resolvedTheme`, and content must be keyed by the mode/title so only the changing panel animates:

```tsx
"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { AppleLockIcon } from "@/components/Icons";
import styles from "./auth-shell.module.css";

export type AuthMode = "sign-in" | "request-access";

type AuthShellProps = {
  title: string;
  description: ReactNode;
  eyebrow?: string;
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  children: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
};

export function AuthShell(props: AuthShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const key = props.mode ?? props.title;
  return (
    <main className={styles.page}>
      <button type="button" className={styles.themeToggle} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Toggle appearance">
        {resolvedTheme === "dark" ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
      </button>
      <motion.section className={`${styles.stage} ${props.compact ? styles.compact : ""}`} initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 340, damping: 30 }}>
        <div className={styles.mark}><AppleLockIcon aria-hidden="true" /></div>
        {props.eyebrow && <p className={styles.eyebrow}>{props.eyebrow}</p>}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={key} className={styles.heading} initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
          </motion.div>
        </AnimatePresence>
        {props.mode && props.onModeChange && <div className={styles.segmented} role="group" aria-label="Access method">
          {(["sign-in", "request-access"] as const).map((mode) => <button key={mode} type="button" aria-pressed={props.mode === mode} onClick={() => props.onModeChange?.(mode)}>{mode === "sign-in" ? "Sign In" : "Request Access"}</button>)}
        </div>}
        <AnimatePresence mode="wait" initial={false}><motion.div key={key} className={styles.content} initial={reduceMotion ? false : { opacity: 0, x: props.mode === "request-access" ? 14 : -14 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: props.mode === "request-access" ? -14 : 14 }}>{props.children}</motion.div></AnimatePresence>
        {props.footer && <footer className={styles.footer}>{props.footer}</footer>}
      </motion.section>
    </main>
  );
}
```

Implement `auth-shell.module.css` with a full-height neutral background, a `max-width: 390px` stage, grouped inputs, 44px controls, circular arrow action, light/dark materials, mobile safe areas, and reduced-motion overrides. Use the historical proportions: 28px title, 12px uppercase floating labels, 17px inputs, 12px group radius, and a compact 32px arrow.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/auth-ui-restoration.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the shell**

```bash
git add src/components/auth/AuthShell.tsx src/components/auth/auth-shell.module.css tests/auth-ui-restoration.test.mjs
git commit -m "feat: add shared Apple auth shell"
```

---

### Task 2: Restore Sign In and Map Sign Up to Request Access

**Files:**
- Create: `src/components/auth/AuthGateway.tsx`
- Modify: `src/components/auth/SignInForm.tsx`
- Modify: `src/components/access/RequestAccessForm.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/request-access/page.tsx`
- Delete: `src/app/request-access/request-access.module.css`
- Test: `tests/auth-ui-restoration.test.mjs`
- Test: `tests/invite-routing.test.mjs`

**Interfaces:**
- Consumes: `AuthShell` and `AuthMode` from Task 1.
- Produces: `AuthGateway({ initialMode, nextPath })`, where `initialMode: AuthMode` and `nextPath?: string | null`.
- Preserves: `SignInForm({ nextPath })` Supabase sign-in/reset behavior and `RequestAccessForm()` access-request API behavior.

- [ ] **Step 1: Add failing behavior-boundary assertions**

Extend `tests/auth-ui-restoration.test.mjs`:

```js
test("gateway maps the historical second segment to request access", () => {
  const gateway = read("src/components/auth/AuthGateway.tsx");
  const signIn = read("src/components/auth/SignInForm.tsx");
  const request = read("src/components/access/RequestAccessForm.tsx");
  assert.match(gateway, /<SignInForm/);
  assert.match(gateway, /<RequestAccessForm/);
  assert.match(gateway, /initialMode/);
  assert.doesNotMatch(gateway, /signUp/);
  assert.match(signIn, /signInWithPassword/);
  assert.doesNotMatch(signIn, /masterKey|masterPassword|signUp/);
  assert.match(request, /JSON\.stringify\(\{ fullName, email, website \}\)/);
  assert.doesNotMatch(request, /password|masterKey|masterPassword/);
});
```

- [ ] **Step 2: Run the focused tests and confirm the gateway is missing**

Run: `node --test tests/auth-ui-restoration.test.mjs tests/invite-routing.test.mjs`

Expected: FAIL because `AuthGateway.tsx` does not exist.

- [ ] **Step 3: Implement the gateway and shell-compatible forms**

Create `AuthGateway.tsx` as a Client Component with `useState(initialMode)`. Render `AuthShell` with:

```tsx
const copy = mode === "sign-in"
  ? { title: "Sign in to Telkar Vault", description: "Use your account credentials. Your vault master key is entered separately after access is verified." }
  : { title: "Request private access", description: "Tell us who you are. Every request is reviewed before an invitation is sent." };

return (
  <AuthShell title={copy.title} description={copy.description} mode={mode} onModeChange={setMode} footer={<span>Your master key never belongs in an access request.</span>}>
    {mode === "sign-in" ? <SignInForm nextPath={nextPath} /> : <RequestAccessForm />}
  </AuthShell>
);
```

Refactor `SignInForm` to return its form body only. Keep `parseSafeNextPath`, `signInWithPassword`, `router.replace`, `router.refresh`, and `resetPasswordForEmail` byte-for-byte equivalent in behavior. Replace standalone card classes with `auth-shell.module.css` grouped field classes and the circular arrow submit action. Keep reset success as `role="status"` and errors as `role="alert"`.

Refactor `RequestAccessForm` to import the shared module. Preserve the hidden `website` honeypot and the exact POST body. Render accepted state inside the shared content region with a compact check mark, “Request received.” heading, and existing non-enumerating response copy.

Update the routes:

```tsx
// src/app/login/page.tsx
return <AuthGateway initialMode="sign-in" nextPath={nextPath} />;

// src/app/request-access/page.tsx
return <AuthGateway initialMode="request-access" />;
```

Delete the superseded request-access CSS module only after no import references remain.

- [ ] **Step 4: Run focused auth and invite tests**

Run: `node --test tests/auth-ui-restoration.test.mjs tests/invite-routing.test.mjs tests/access-request-service.test.mjs`

Expected: PASS, including the existing assertion that public login never calls `signUp` or asks for a master key.

- [ ] **Step 5: Commit the gateway restoration**

```bash
git add src/components/auth/AuthGateway.tsx src/components/auth/SignInForm.tsx src/components/access/RequestAccessForm.tsx src/app/login/page.tsx src/app/request-access/page.tsx src/app/request-access/request-access.module.css tests/auth-ui-restoration.test.mjs
git commit -m "feat: restore invite-safe auth gateway UI"
```

---

### Task 3: Unify Invitation, Onboarding, and Reset Presentation

**Files:**
- Modify: `src/app/accept-invite/page.tsx`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/components/auth/OnboardingForm.tsx`
- Modify: `src/app/onboarding/onboarding.module.css`
- Modify: `src/app/reset-password/page.tsx`
- Test: `tests/auth-ui-restoration.test.mjs`
- Test: `tests/invite-onboarding.test.mjs`

**Interfaces:**
- Consumes: `AuthShell` from Task 1.
- Preserves: server-side `requireUser`, membership redirects, token form action to `/auth/confirm`, `getExpectedUserAuthorization`, user-bound master-key commit, and password reset session exchange.

- [ ] **Step 1: Add failing route-preservation tests**

Extend `tests/auth-ui-restoration.test.mjs`:

```js
test("the complete account journey shares presentation and preserves secure handlers", () => {
  const accept = read("src/app/accept-invite/page.tsx");
  const onboardingPage = read("src/app/onboarding/page.tsx");
  const onboardingForm = read("src/components/auth/OnboardingForm.tsx");
  const reset = read("src/app/reset-password/page.tsx");
  for (const source of [accept, onboardingPage, reset]) assert.match(source, /AuthShell/);
  assert.match(accept, /action="\/auth\/confirm"/);
  assert.match(onboardingPage, /requireUser/);
  assert.match(onboardingPage, /getMembershipForUser/);
  assert.match(onboardingForm, /getExpectedUserAuthorization/);
  assert.match(onboardingForm, /setMasterKey\(masterKey, userId\)/);
  assert.match(reset, /exchangeCodeForSession/);
  assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
});
```

- [ ] **Step 2: Run the focused tests and confirm the routes do not yet share the shell**

Run: `node --test tests/auth-ui-restoration.test.mjs tests/invite-onboarding.test.mjs`

Expected: FAIL on missing `AuthShell` usage while all pre-existing security assertions remain green.

- [ ] **Step 3: Compose existing route logic into the shared shell**

Wrap invite acceptance with `AuthShell` using `eyebrow="Private invitation · 01"`, the existing valid/expired titles, and the existing POST form or return link as children. Keep the hidden `token_hash` and `type` fields unchanged.

Wrap onboarding with `AuthShell` using `eyebrow="Private setup · 02"`, title “Two secrets. Two separate jobs.”, and the existing explanatory copy. Keep `OnboardingPage` a Server Component and pass the interactive `OnboardingForm` as children. Move the two-item secret guide into a compact shell footer or onboarding-specific block.

Update `OnboardingForm` classes only. Do not change `completeOnboarding`, field autocomplete values, authorization-token capture, identity rechecks, API body, `setMasterKey(masterKey, userId)`, or redirects.

Wrap reset password with `AuthShell` while leaving it a Client Component. Use `compact`, preserve `exchangeCodeForSession`, session validation, password validation, and `supabase.auth.updateUser({ password })`. Use grouped fields and the same arrow action.

- [ ] **Step 4: Run invitation and auth regression tests**

Run: `node --test tests/auth-ui-restoration.test.mjs tests/invite-onboarding.test.mjs tests/invite-routing.test.mjs tests/auth-boundaries.test.mjs tests/vault-key-ownership.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the journey-wide presentation**

```bash
git add src/app/accept-invite/page.tsx src/app/onboarding/page.tsx src/components/auth/OnboardingForm.tsx src/app/onboarding/onboarding.module.css src/app/reset-password/page.tsx tests/auth-ui-restoration.test.mjs
git commit -m "style: unify invitation authentication journey"
```

---

### Task 4: Full Verification and Visual QA

**Files:**
- Modify only if verification exposes a scoped auth UI regression.

**Interfaces:**
- Verifies the deliverables from Tasks 1–3 and the unchanged private `Auth` master-key flow.

- [ ] **Step 1: Run static checks and the full regression suite**

Run sequentially:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Expected: every command exits 0; build completes under Next.js 16.2.10 without client/server boundary errors.

- [ ] **Step 2: Start the local production-like UI and check logged-out desktop states**

Run `npm run dev` and inspect `/login`, `/request-access`, `/accept-invite?state=expired`, and `/reset-password` at 1440×900. Verify centered composition, narrow historical proportions, mode switching, visible focus, no horizontal overflow, no console errors, and consistent light/dark themes.

- [ ] **Step 3: Check mobile states**

Inspect the same routes at 390×844 and 320×700. Verify safe-area spacing, no clipped submit action, at least 44px touch targets, grouped fields contained within the viewport, keyboard-accessible segmented control, and reduced-motion behavior.

- [ ] **Step 4: Check real current flows without mutating production data unnecessarily**

Use the existing approved local account to verify that account sign-in reaches `/vault`, then confirm the private master-key screen appears separately. Do not place the master key into the account sign-in form or request-access flow. Verify reset-password action can be initiated without changing the master key. For Request Access, use validation-only checks unless an explicit disposable address is available.

- [ ] **Step 5: Review the final diff for behavior drift**

Run:

```bash
git diff 760fef0 -- src/components/auth src/components/access src/app/login src/app/request-access src/app/accept-invite src/app/onboarding src/app/reset-password
git diff --check
git status --short
```

Confirm the old `supabase.auth.signUp` path was not restored, no master key entered the public forms, and the pre-existing untracked diagnostic files remain untouched.

- [ ] **Step 6: Commit any verification-only correction**

If visual QA required a correction, stage only the auth UI files and commit:

```bash
git commit -m "fix: finish responsive auth UI restoration"
```

If no correction was needed, do not create an empty commit.
