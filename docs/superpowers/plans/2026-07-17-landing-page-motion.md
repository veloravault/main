# Landing Page Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add restrained, Apple-like Framer Motion across every appropriate public landing-page section while preserving accessibility, layout stability, and the concurrent inside-app work.

**Architecture:** Centralize typed easing, viewport, reveal, stagger, hover, and tap values in `src/components/dreelio/motion.ts`. Each landing component applies those tokens directly to its existing semantic elements; a focused `ParallaxMedia` client component owns the only scroll-linked behavior so parallax remains low amplitude and easy to disable.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.7, TypeScript, Framer Motion 12.42.2, CSS Modules, Node test runner.

## Global Constraints

- Modify only `src/components/dreelio/**`, landing-specific tests, and these planning documents.
- Do not touch vault modules, authentication, dashboards, database code, `src/app/globals.css`, or the shared inside-app shell.
- Preserve all landing-page copy and information architecture.
- Use transform and opacity for animation; do not create layout shifts.
- Respect `prefers-reduced-motion` with opacity-only or immediate state changes.
- Do not commit while another agent is active in the shared checkout.
- Before each task, compare `git status --short` and hashes of the task's target files with the last observed state; stop and reconcile if a target changed concurrently.

---

### Task 1: Shared Motion Foundation and Regression Contract

**Files:**
- Create: `src/components/dreelio/motion.ts`
- Create: `src/components/dreelio/ParallaxMedia.tsx`
- Create: `tests/dreelio-motion.test.mjs`

**Interfaces:**
- Produces: `APPLE_EASE`, `LANDING_VIEWPORT`, `revealVariants(distance)`, `fadeScaleVariants`, `staggerContainer`, `staggerItem`, `HOVER_LIFT`, and `TAP_PRESS`.
- Produces: `ParallaxMedia({ children, className?, distance?, delay? })`.

- [ ] **Step 1: Write the failing regression test**

Add assertions that the motion foundation exports the shared tokens, uses typed Framer Motion `Variants`, includes `useReducedMotion`, and that each main landing component imports either the shared tokens or `ParallaxMedia`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/dreelio-motion.test.mjs`

Expected: FAIL because `src/components/dreelio/motion.ts` and `ParallaxMedia.tsx` do not exist.

- [ ] **Step 3: Implement typed motion tokens**

Use a single curve `[0.22, 1, 0.36, 1]`, reveal distances between 14 and 28 pixels, one-time viewport triggers, card lift no larger than 5 pixels, and tap scale no smaller than `0.985`.

- [ ] **Step 4: Implement `ParallaxMedia`**

Use `useScroll`, `useTransform`, and `useReducedMotion`; map scroll progress to `[-distance, distance]`, fall back to `y: 0`, and combine the scroll transform with a one-time reveal.

- [ ] **Step 5: Run the focused test**

Run: `node --test tests/dreelio-motion.test.mjs`

Expected: shared-foundation assertions pass; section-coverage assertions remain failing until Tasks 2-4.

---

### Task 2: Navigation, Hero, Devices, and Feature Splits

**Files:**
- Modify: `src/components/dreelio/Nav.tsx`
- Modify: `src/components/dreelio/Hero.tsx`
- Modify: `src/components/dreelio/Devices.tsx`
- Modify: `src/components/dreelio/FeatureSplit.tsx`

**Interfaces:**
- Consumes: all exports from `motion.ts` and `ParallaxMedia`.
- Produces: staged first-view entrance, device-image crossfade, tactile tabs, and low-amplitude product-image parallax.

- [ ] **Step 1: Apply a calm navigation entrance and interaction feedback**

Keep the existing theme-button `AnimatePresence`; add a small `y`/opacity entrance to the nav capsule and `whileHover`/`whileTap` feedback to interactive controls without changing hrefs or button behavior.

- [ ] **Step 2: Stage the hero**

Make `Hero.tsx` a client component, stagger the title, subtitle, actions, dashboard, and badge, wrap dashboard media with `ParallaxMedia`, and disable transforms when reduced motion is preferred.

- [ ] **Step 3: Animate device state changes**

Use `AnimatePresence` with `mode="wait"` around a keyed image, fade/scale between mobile and web previews, and add spring-like tab press feedback. Preserve the tab roles and selected state.

- [ ] **Step 4: Animate feature splits**

Make `FeatureSplit.tsx` a client component, reveal media and copy from their natural side, stagger pills, add CTA hover/tap feedback, and apply `ParallaxMedia` to product imagery.

- [ ] **Step 5: Run focused lint and the motion test**

Run: `npm run lint -- src/components/dreelio/Nav.tsx src/components/dreelio/Hero.tsx src/components/dreelio/Devices.tsx src/components/dreelio/FeatureSplit.tsx src/components/dreelio/motion.ts src/components/dreelio/ParallaxMedia.tsx tests/dreelio-motion.test.mjs`

Run: `node --test tests/dreelio-motion.test.mjs`

Expected: zero lint errors and coverage assertions passing for these four sections.

---

### Task 3: Feature, Highlight, Testimonial, and Pricing Sections

**Files:**
- Modify: `src/components/dreelio/Features.tsx`
- Modify: `src/components/dreelio/Highlights.tsx`
- Modify: `src/components/dreelio/Testimonials.tsx`
- Modify: `src/components/dreelio/Pricing.tsx`

**Interfaces:**
- Consumes: shared variants and interaction tokens from `motion.ts`.
- Produces: consistent section reveals, staggered repeated content, tactile cards, and animated pricing state.

- [ ] **Step 1: Align existing feature animations**

Type the existing variants with Framer Motion `Variants`, replace ad-hoc curves with shared tokens, keep the animated widgets, and ensure all continuous CSS animations already stop under reduced motion.

- [ ] **Step 2: Stagger highlights**

Make `Highlights.tsx` a client component, reveal the section heading, stagger the three cards, and add a maximum 4-pixel hover lift plus `0.99` tap feedback.

- [ ] **Step 3: Reveal testimonials without adding continuous noise**

Make `Testimonials.tsx` a client component, reveal the promise copy and marquee container, preserve the existing marquee speed, and add only local card hover feedback.

- [ ] **Step 4: Animate pricing cards and state**

Reveal/stagger the plans, add tactile card/CTA feedback, and animate only the price text when Personal/Family changes using keyed `AnimatePresence`. Preserve tab semantics and plan content.

- [ ] **Step 5: Run focused lint and tests**

Run the landing motion test plus ESLint on the four modified components.

Expected: zero test failures and zero lint errors.

---

### Task 4: Blog, Final CTA, and Footer

**Files:**
- Modify: `src/components/dreelio/Blog.tsx`
- Modify: `src/components/dreelio/FinalCTA.tsx`
- Modify: `src/components/dreelio/Footer.tsx`

**Interfaces:**
- Consumes: shared variants and interaction tokens from `motion.ts`.
- Produces: a paced closing sequence with no new continuous animation.

- [ ] **Step 1: Sequence blog content**

Reveal the section heading, then the featured story, then stagger the post cards. Add restrained hover/tap feedback to linked cards and keep image movement within a 1.02 scale.

- [ ] **Step 2: Animate the final CTA**

Stagger title, subtitle, and button; add subtle button hover/tap feedback without changing navigation.

- [ ] **Step 3: Animate the footer**

Reveal the footer card once, stagger link columns, and use small link hover movement that does not reflow text.

- [ ] **Step 4: Run the complete focused contract**

Run: `node --test tests/dreelio-motion.test.mjs tests/dreelio-logo-assets.test.mjs`

Expected: all landing-specific tests pass.

---

### Task 5: Verification and Concurrency Audit

**Files:**
- Verify only; do not modify outside the global scope boundary.

**Interfaces:**
- Consumes: completed landing motion system.
- Produces: evidence for correctness, accessibility, and non-collision.

- [ ] **Step 1: Confirm touched-file scope**

Run `git status --short` and `git diff --name-only`; verify our edits are limited to `src/components/dreelio/**`, landing-specific tests, `next.config.ts` from the earlier logo task, and motion planning documents. Treat any inside-app changes as concurrent user/agent work and leave them untouched.

- [ ] **Step 2: Run tests and lint**

Run the landing-specific tests, ESLint on every modified landing TypeScript file, and `git diff --check`.

- [ ] **Step 3: Run the production build**

Run `npm run build`. If it fails, identify whether the error is in a landing file changed here or a pre-existing/concurrent file; fix only landing-motion regressions.

- [ ] **Step 4: Visual desktop verification**

Inspect the local page at desktop width. Verify entrance pacing, scroll reveals, hover/tap behavior, device/pricing transitions, loaded brand assets, and absence of layout shifts.

- [ ] **Step 5: Visual mobile and reduced-motion verification**

Inspect a mobile viewport and emulate reduced motion. Verify content remains readable, controls remain usable, transforms are removed or minimized, and no section stays hidden.

- [ ] **Step 6: Final concurrent-change check**

Re-run hashes/status for every modified landing file. If a target changed after our edit, review and reconcile only that file before reporting completion.
