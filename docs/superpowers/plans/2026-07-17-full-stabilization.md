# Velora Vault Full Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove unsupported Family functionality and ship a coherent, production-verifiable Velora Vault experience across authentication, onboarding, payments, marketing, administration, storage, domain handling, and documentation.

**Architecture:** Keep the existing Next.js 16 App Router, Supabase authorization boundary, Cloudflare R2 storage path, and Razorpay subscription integration. Replace the global auth-modal dependency with normal routes, reduce plans to Free and Plus, expose the existing append-only admin audit records through an owner-only paginated endpoint, and use only real product imagery and downloaded payment-network assets.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, TypeScript 5, Supabase SSR/Postgres, Cloudflare R2, Razorpay REST, Node test runner, CSS Modules.

## Global Constraints

- Keep only Free and Plus plans; no Family plan, family seats, family billing, or family admin claims.
- Keep `/login` and `/signup` as separate single-purpose pages; remove the authentication popup.
- The vault master key must remain client-only and memory-only.
- Admin data remains owner-only and every privileged handler must authorize before repository work.
- Payment logos must be downloaded brand assets, not recreated with JSX, CSS, or generated SVG markup.
- Canonical production origin is `https://veloravault.in`; redirect `www.veloravault.in` before same-origin-sensitive handling.
- Preserve the settled Apple ecosystem visual direction while making admin screens information-dense and operational.
- Do not overwrite unrelated work in `.claude/settings.json`; remove only the embedded Gmail credential/command and require credential rotation outside the repository.

---

### Task 1: Remove the auth popup and repair public auth layouts

**Files:**
- Modify: `src/components/dreelio/PublicPageShell.tsx`
- Modify: `src/components/dreelio/Nav.tsx`
- Modify: `src/components/dreelio/Hero.tsx`
- Modify: `src/components/dreelio/Pricing.tsx`
- Modify: `src/components/dreelio/PricingPageContent.tsx`
- Modify: `src/components/dreelio/FinalCTA.tsx`
- Modify: `src/components/dreelio/BlogListContent.tsx`
- Modify: `src/components/dreelio/BlogPostContent.tsx`
- Modify: `src/components/dreelio/SecurityPageContent.tsx`
- Modify: `src/components/auth/AuthGateway.tsx`
- Modify: `src/components/auth/AuthShell.tsx`
- Modify: `src/components/auth/auth-shell.module.css`
- Delete: `src/components/auth/AuthModalProvider.tsx`
- Test: `tests/auth-ui-restoration.test.mjs`

**Interfaces:**
- Produces: `/login` and `/signup` links with optional safe `next` query; `AuthGateway` renders one immutable mode and a cross-link.

- [ ] Write source-level regression assertions that public shell has no modal provider, public CTAs use route links, and auth shell has header-aware minimum height and cross-links.
- [ ] Run `node --test tests/auth-ui-restoration.test.mjs` and confirm the new assertions fail on modal imports or missing links.
- [ ] Replace all `useAuthModal` calls with `next/link` or `router.push`, remove modal-only shell code, and make each `AuthGateway` mode immutable.
- [ ] Run `node --test tests/auth-ui-restoration.test.mjs` and confirm all assertions pass.

### Task 2: Make onboarding completion explicit and layout-safe

**Files:**
- Modify: `src/components/auth/OnboardingFlow.tsx`
- Modify: `src/components/auth/onboarding-steps/CompletionStep.tsx`
- Modify: `src/components/auth/auth-shell.module.css`
- Test: `tests/onboarding-flow.test.mjs`

**Interfaces:**
- Produces: completion destination state and explicit user-triggered navigation after activation.

- [ ] Add failing assertions that successful setup stores a destination, renders an actionable completion control, and does not immediately call `router.replace` in the activation block.
- [ ] Run `node --test tests/onboarding-flow.test.mjs` and confirm the immediate redirect violates the test.
- [ ] Preserve identity recheck, activation, key handoff, clearing, and plan-intent order; then render `CompletionStep` with an explicit `onContinue` callback.
- [ ] Run `node --test tests/onboarding-flow.test.mjs` and confirm all onboarding security and UX assertions pass.

### Task 3: Reduce billing to Free and Plus and align cancellation semantics

**Files:**
- Modify: `src/lib/plans.ts`
- Modify: `src/lib/planIntent.ts`
- Modify: `src/lib/server/razorpay.ts`
- Modify: `src/app/api/payments/create-subscription/route.ts`
- Modify: `src/components/dreelio/pricing-data.ts`
- Modify: `src/components/dreelio/PricingPageContent.tsx`
- Modify: `src/components/settings/PlanSettings.tsx`
- Modify: `src/components/settings/settings-types.ts`
- Modify: `src/components/VaultApp.tsx`
- Create via `npx supabase migration new remove_family_plan`: `supabase/migrations/<generated>_remove_family_plan.sql`
- Test: `tests/landing-trust.test.mjs`
- Test: `tests/project-integrity.test.mjs`
- Test: `tests/server-boundaries.test.mjs`

**Interfaces:**
- Produces: `PlanId = "free" | "plus"`, `PaidPlanId = "plus"`, two-column pricing comparison, and Razorpay cancellation body `{ cancel_at_cycle_end: true }`.

- [ ] Add failing tests rejecting every Family marketing/runtime token and requiring end-of-cycle cancellation.
- [ ] Run the three focused test files and confirm they fail against current Family and cancellation behavior.
- [ ] Remove Family from client/server enums, checkout validation, plan intent, settings, metadata, and pricing copy; add a migration mapping any legacy `family` rows to `plus` and tightening plan constraints.
- [ ] Send `cancel_at_cycle_end: true` and retain the local subscription until webhook/provider state confirms cancellation.
- [ ] Run the three focused test files and confirm they pass.

### Task 4: Replace fabricated payment marks and unrelated product imagery

**Files:**
- Create: `public/payment-logos/visa.svg`
- Create: `public/payment-logos/mastercard.svg`
- Create: `public/payment-logos/rupay.svg`
- Create: `public/payment-logos/upi.svg`
- Modify: `src/components/dreelio/PaymentBadges.tsx`
- Modify: `src/components/dreelio/PaymentBadges.module.css`
- Modify: `src/components/dreelio/Hero.tsx`
- Modify: `src/components/dreelio/Devices.tsx`
- Modify: `src/app/page.tsx`
- Create: focused Velora product-preview components or screenshots under `src/components/dreelio/` and `public/velora/`.
- Test: `tests/dreelio-logo-assets.test.mjs`
- Test: `tests/landing-integrity.test.mjs`

**Interfaces:**
- Produces: `<Image>`-based official payment marks and Velora-only preview media.

- [ ] Add failing assertions that no payment network is drawn in JSX/CSS and no landing component references `/dreelio/img/` product screenshots.
- [ ] Run the focused tests and confirm they fail.
- [ ] Save downloaded network assets with source attribution, render them through `next/image`, keep “Net Banking” as supporting text, and replace third-party dashboard screenshots with real Velora UI previews.
- [ ] Run the focused tests and confirm they pass.

### Task 5: Turn the admin placeholder into an operational owner console

**Files:**
- Create: `src/app/api/admin/activity/route.ts`
- Create: `src/components/admin/AdminActivity.tsx`
- Create: `src/components/admin/AdminConfirmDialog.tsx`
- Modify: `src/components/admin/types.ts`
- Modify: `src/components/admin/admin-client.ts`
- Modify: `src/components/admin/AdminConsole.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/app/admin/admin.module.css`
- Modify: `src/lib/server/access-repository.ts`
- Test: `tests/admin-route-boundaries.test.mjs`
- Test: `tests/admin-ui-integrity.test.mjs`

**Interfaces:**
- Produces: owner-only paginated `/api/admin/activity`; typed `AdminActivityItem`; accessible confirmation dialog; members-only search; vault and sign-out navigation.

- [ ] Add failing authorization, DTO, activity-fetch, no-`window.confirm`, search visibility, and navigation assertions.
- [ ] Run both admin test files and confirm the new assertions fail.
- [ ] Add paginated audit repository/route, split the activity and confirmation UI, keep monotonic suspend/revoke semantics explicit, and compact the visual hierarchy.
- [ ] Run both admin test files and confirm they pass.

### Task 6: Canonicalize production, scrub credential configuration, and update policy/docs

**Files:**
- Modify: `next.config.ts`
- Modify: `src/proxy.ts`
- Modify: `src/app/privacy/page.tsx`
- Modify: `README.md`
- Rewrite: `docs/project-context-2026-07-15.md`
- Modify: `.claude/settings.json` in the primary checkout only, preserving unrelated settings.
- Test: `tests/landing-trust.test.mjs`
- Test: `tests/server-boundaries.test.mjs`

**Interfaces:**
- Produces: production-only `www` to apex redirect, R2-compatible CSP, accurate provider disclosure, and no embedded mail credential.

- [ ] Add failing redirect, CSP, and provider-copy assertions.
- [ ] Run focused tests and confirm they fail.
- [ ] Add the host-aware production redirect using the installed Next.js 16 redirect/proxy conventions, keep R2 in `connect-src`, and update current architecture/privacy documentation.
- [ ] Remove the credential-bearing command from the primary checkout settings without exposing the credential in output; record Google rotation as an external operator action.
- [ ] Run focused tests and confirm they pass.

### Task 7: Full verification and deployment handoff

**Files:**
- Review: all modified files

**Interfaces:**
- Consumes: every prior task.
- Produces: a verified branch suitable for push and production deployment.

- [ ] Run `npm test` and require 0 failures.
- [ ] Run `npm run lint` and require exit 0.
- [ ] Run `npm run build` and require exit 0 with all routes generated.
- [ ] Run `npm audit --audit-level=high` and require no high/critical findings.
- [ ] Start the production server and browser-check public pages at desktop and 390px mobile widths.
- [ ] Browser-check `/login`, `/signup`, pricing, footer marks, canonical redirect behavior, and the unauthenticated admin redirect without mutating live data.
- [ ] Report external-only actions separately: Gmail credential rotation, hosted migration application, Razorpay live-mode plan configuration, R2 CORS verification, push, and deployment.
