# Landing Trust Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace contradictory and unsupported public messaging with one truthful private-beta story, a verified security page, finished landing content, and a Velora-specific sealed-aperture motif.

**Architecture:** Keep the new security route server-rendered and reuse the existing legal header/root tokens. Replace the client-side pricing and testimonial carousel with focused landing components, while confining all work to public landing/security files and integrity tests.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Framer Motion, Node test runner

## Global Constraints

- Do not modify authenticated vault, admin, invitation, database, or encryption behavior.
- Public access copy must say “Free during private beta” and must not promise guaranteed approval or timing.
- Only make security claims directly supported by repository code and migrations.
- Remove native iOS/Android and instantaneous realtime-sync claims.
- Disclose master-key recovery limits, local-device threats, PIN offline-guessing limits, and selected-source AI processing.
- Keep motion restrained and reduced-motion safe.

---

### Task 1: Public trust integrity test

**Files:**
- Create: `tests/landing-trust.test.mjs`

**Interfaces:**
- Consumes: public page/component source files
- Produces: source-integrity assertions covering the approved content contract

- [ ] Write assertions for beta messaging, the four access steps, `/security`, supported crypto details, recovery and threat boundaries, absence of blog placeholders, and absence of unsupported platform/sync claims.
- [ ] Run `node --test tests/landing-trust.test.mjs` and confirm it fails because the new public contract is not implemented.

### Task 2: Unified beta access story

**Files:**
- Modify: `src/components/dreelio/Pricing.tsx`
- Modify: `src/components/dreelio/Pricing.module.css`
- Modify: `src/components/dreelio/data.ts`
- Modify: `src/components/dreelio/Hero.tsx`
- Modify: `src/components/dreelio/FinalCTA.tsx`
- Modify: `src/components/auth/AuthGateway.tsx`
- Modify: `src/components/access/RequestAccessForm.tsx`

**Interfaces:**
- Consumes: `/request-access` and the existing access-request API
- Produces: one private-beta invitation story and matching completion copy

- [ ] Replace the three-tier pricing grid with one beta panel and a four-step explanation.
- [ ] Align hero, final CTA, request page, and success state with manual review and invitation email behavior.
- [ ] Run the focused test and confirm access assertions pass while remaining assertions stay red.

### Task 3: Verified security architecture and security page

**Files:**
- Create: `src/components/dreelio/SecurityArchitecture.tsx`
- Create: `src/components/dreelio/SecurityArchitecture.module.css`
- Create: `src/app/security/page.tsx`
- Create: `src/app/security/security.module.css`
- Modify: `src/app/page.tsx`
- Modify: `src/components/dreelio/data.ts`
- Modify: `src/components/dreelio/Hero.tsx`
- Modify: `src/components/dreelio/Highlights.tsx`

**Interfaces:**
- Consumes: verified behavior in `src/lib/crypto.ts`, `src/components/auth/VaultKeyProvider.tsx`, `src/components/PinLock.tsx`, `src/lib/biometrics.ts`, and Supabase migrations
- Produces: `/security` and a static landing summary linking to it

- [ ] Replace the testimonial carousel with four semantic architecture cards.
- [ ] Add recovery, threat-model, local unlock, RLS, and AI-processing disclosures to `/security`.
- [ ] Remove unsupported instant-sync and misleading unlock language.
- [ ] Run the focused test and confirm security assertions pass.

### Task 4: Remove unfinished editorial content and add the Velora signature

**Files:**
- Create: `src/components/dreelio/VaultSeal.tsx`
- Create: `src/components/dreelio/VaultSeal.module.css`
- Modify: `src/components/dreelio/Hero.tsx`
- Modify: `src/components/dreelio/Hero.module.css`
- Modify: `src/components/dreelio/Nav.tsx`
- Modify: `src/components/dreelio/Footer.tsx`
- Modify: `src/components/dreelio/data.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: existing Velora brand mark and landing motion primitives
- Produces: reduced-motion-safe sealed aperture and no dead blog links

- [ ] Remove the blog section and all landing navigation/footer references to it.
- [ ] Build the four-loop aperture around the existing brand mark and place it in the hero/security surfaces.
- [ ] Run `node --test tests/landing-trust.test.mjs tests/dreelio-motion.test.mjs tests/dreelio-logo-assets.test.mjs` and confirm all focused tests pass.

### Task 5: Verification

**Files:**
- Modify only if verification exposes a scoped defect.

**Interfaces:**
- Consumes: completed public landing/security implementation
- Produces: fresh automated and visual evidence

- [ ] Run the landing-focused tests.
- [ ] Run lint on all modified TypeScript files.
- [ ] Run `npm run build`.
- [ ] Check `/`, `/request-access`, and `/security` at desktop and mobile widths, including reduced motion and keyboard navigation.
- [ ] Review `git diff` to confirm authenticated/app files were not changed.

