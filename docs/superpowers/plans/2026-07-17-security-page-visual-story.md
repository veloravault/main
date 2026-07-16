# Security Page Visual Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/security` with the shared public header and footer plus restrained, explanatory security animations while preserving every current claim and limitation.

**Architecture:** Keep `src/app/security/page.tsx` as the metadata-owning Server Component. Move all motion into a focused client boundary, `SecurityPageContent`, and isolate its animated diagrams in `SecurityVisuals.tsx`; compose the existing `Nav` and `Footer` at the route level.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, CSS Modules, Framer Motion, Lucide icons, Node test runner.

## Global Constraints

- Do not modify authenticated vault screens or shared inside-app navigation.
- Preserve the existing `/security` claims and limitation language.
- Reuse `Nav`, `Footer`, `VaultSeal`, and shared motion tokens.
- Add no remote images, generated images, canvas, video, dependencies, or infinite animation loops.
- Motion must respect `useReducedMotion` and settle into a complete readable state.
- Mobile layouts must not create horizontal overflow.

---

### Task 1: Security page contract test

**Files:**
- Modify: `tests/landing-trust.test.mjs`

**Interfaces:**
- Consumes: current `/security` route source and the approved visual-story specification.
- Produces: a regression contract for `Nav`, `Footer`, `SecurityPageContent`, `SecurityFlowVisual`, `RecoveryVisual`, shared motion tokens, and reduced-motion handling.

- [ ] **Step 1: Write the failing test**

Add a test named `security explainer uses the public shell and an accessible motion story`. It must assert that the route imports and renders `Nav`, `Footer`, and `SecurityPageContent`; the visual file exports `SecurityFlowVisual` and `RecoveryVisual`; the client content and visuals use `useReducedMotion`; shared motion tokens are imported; and the page retains the phrases `cannot recover`, `offline guessing`, and `manual entry`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-name-pattern='security explainer uses the public shell' tests/landing-trust.test.mjs`

Expected: FAIL because the route still renders `LegalHeader` and the visual-story files do not exist.

- [ ] **Step 3: Keep the failure as the implementation gate**

Do not weaken or remove assertions after production work begins. The test should pass only after Tasks 2 and 3 are complete.

---

### Task 2: Animated security illustrations

**Files:**
- Create: `src/components/dreelio/SecurityVisuals.tsx`
- Create: `src/components/dreelio/SecurityVisuals.module.css`

**Interfaces:**
- Consumes: `VaultSeal`, `APPLE_EASE`, `LANDING_VIEWPORT`, `revealVariants`, and `staggerContainer` from existing landing components.
- Produces: `SecurityFlowVisual({ mode }: { mode: "encryption" | "authorization" | "unlock" })` and `RecoveryVisual()`.

- [ ] **Step 1: Implement the visual component API**

Create a client component file exporting the two named components. Each mode must render concise semantic labels, a decorative visual layer marked `aria-hidden="true"`, and Framer Motion states that use the shared easing and viewport tokens.

- [ ] **Step 2: Implement the sealed-path visual language**

Use CSS-only rows, ciphertext blocks, a gate, local-device glyph, and the existing `VaultSeal`. Keep motion finite, transform/opacity based, and disabled or immediately completed when `useReducedMotion()` is true.

- [ ] **Step 3: Implement responsive and dark-mode styles**

The visual cards must fill their grid column, preserve contrast using landing tokens, collapse without overflow below 720px, and include a `prefers-reduced-motion` fallback.

- [ ] **Step 4: Verify component quality**

Run: `npx eslint src/components/dreelio/SecurityVisuals.tsx`

Expected: PASS with no warnings.

---

### Task 3: Shared-shell security story

**Files:**
- Create: `src/components/dreelio/SecurityPageContent.tsx`
- Modify: `src/app/security/page.tsx`
- Modify: `src/app/security/security.module.css`

**Interfaces:**
- Consumes: the two visual exports from Task 2 plus `Nav`, `Footer`, shared motion tokens, and existing security copy.
- Produces: the complete responsive `/security` public page.

- [ ] **Step 1: Compose the public shell**

Remove `LegalHeader` from the route, import `Nav`, `Footer`, and `SecurityPageContent`, and render them inside the existing landing root. Keep the current metadata export in the Server Component.

- [ ] **Step 2: Build the client story wrapper**

Move the existing page content into `SecurityPageContent`. Use `motion.section`, `whileInView`, `LANDING_VIEWPORT`, `revealVariants`, and stagger variants. Pair encryption, authorization, and local-unlock copy with the corresponding `SecurityFlowVisual`; pair recovery copy with `RecoveryVisual`.

- [ ] **Step 3: Refine editorial layout and interactions**

Update the CSS module for a shared-nav offset, two-column hero, alternating story rows, staggered fact cards, tactile boundary cards, restrained recovery treatment, mobile stacking, dark mode, focus visibility, and reduced motion. Preserve all original body copy and actions.

- [ ] **Step 4: Run the contract test**

Run: `node --test --test-name-pattern='security explainer uses the public shell' tests/landing-trust.test.mjs`

Expected: PASS.

---

### Task 4: Regression and browser verification

**Files:**
- Modify only if a verified defect requires it: `src/app/security/security.module.css`, `src/components/dreelio/SecurityPageContent.tsx`, `src/components/dreelio/SecurityVisuals.tsx`, `src/components/dreelio/SecurityVisuals.module.css`

**Interfaces:**
- Consumes: completed security route.
- Produces: verified desktop/mobile, light/dark, reduced-motion-safe page.

- [ ] **Step 1: Run focused and landing tests**

Run: `node --test tests/landing-trust.test.mjs tests/dreelio-motion.test.mjs`

Expected: all tests pass.

- [ ] **Step 2: Run static verification**

Run: `npx eslint src/app/security/page.tsx src/components/dreelio/SecurityPageContent.tsx src/components/dreelio/SecurityVisuals.tsx tests/landing-trust.test.mjs && npm run build`

Expected: lint and production build pass.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/security`; inspect at 1440px and 390px widths, light and dark appearance. Confirm shared nav/footer, readable sequence, no horizontal overflow, completed reduced-motion state, and no console errors.

- [ ] **Step 4: Review only the scoped diff**

Run: `git diff --check -- src/app/security src/components/dreelio/SecurityPageContent.tsx src/components/dreelio/SecurityVisuals.tsx src/components/dreelio/SecurityVisuals.module.css tests/landing-trust.test.mjs`

Expected: no whitespace errors and no inside-app files changed.
