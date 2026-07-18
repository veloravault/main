# Auth Strength Meter and Onboarding Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a clearly progressive, semantically colored password-strength meter and a consistent Apple-style onboarding symbol system.

**Architecture:** Extract the repeated signup/onboarding strength UI into a presentational `PasswordStrengthMeter` driven by the existing `getStrength` result. Keep onboarding behavior unchanged while mapping each step and intro benefit to a restrained Lucide icon rendered through shared CSS-module treatments.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, TypeScript 5, CSS Modules, Lucide React, Node test runner.

## Global Constraints

- Do not add image assets or edit SEO surfaces.
- Keep the vault master key client-only and memory-only.
- Use Lucide symbols rather than emoji, custom SVG markup, or SF Symbols.
- Preserve existing reduced-motion and responsive behavior.

---

### Task 1: Shared progressive strength meter

**Files:**
- Create: `src/components/auth/PasswordStrengthMeter.tsx`
- Modify: `src/components/auth/SignUpForm.tsx`
- Modify: `src/components/auth/onboarding-steps/MasterKeyStep.tsx`
- Modify: `src/components/auth/auth-shell.module.css`
- Test: `tests/auth-strength-and-icons.test.mjs`

**Interfaces:**
- Consumes: `StrengthResult` from `src/lib/passwordHealth.ts`.
- Produces: `PasswordStrengthMeter({ strength })`, a four-segment accessible meter.

- [ ] **Step 1: Write failing meter tests**

Assert four segments, level-to-segment progression, semantic strength colors, `role="progressbar"`, and both consumers importing the shared component.

- [ ] **Step 2: Verify RED**

Run `node --test tests/auth-strength-and-icons.test.mjs` and require failure because `PasswordStrengthMeter.tsx` does not exist.

- [ ] **Step 3: Implement the shared meter**

Render four decorative segments from the strength level, expose score and label through progressbar attributes, and style filled segments with the current semantic tone.

- [ ] **Step 4: Verify GREEN**

Run `node --test tests/auth-strength-and-icons.test.mjs` and require all meter assertions to pass.

### Task 2: Consistent onboarding symbol vocabulary

**Files:**
- Create: `src/components/auth/onboarding-steps/OnboardingStepIcon.tsx`
- Modify: `src/components/auth/onboarding-steps/IntroScreen.tsx`
- Modify: `src/components/auth/onboarding-steps/AvatarStep.tsx`
- Modify: `src/components/auth/onboarding-steps/MasterKeyStep.tsx`
- Modify: `src/components/auth/onboarding-steps/CompletionStep.tsx`
- Modify: `src/components/auth/onboarding-steps/onboardingSteps.ts`
- Modify: `src/components/auth/onboarding.module.css`
- Test: `tests/auth-strength-and-icons.test.mjs`

**Interfaces:**
- Produces: an approved icon map for vault, security, avatar, master key, and completion; intro bullets carry explicit icon ids.

- [ ] **Step 1: Write failing icon-system tests**

Assert the five approved Lucide symbols, meaning-specific intro benefit icons, no emoji/custom SVG, and shared rounded-square icon treatment.

- [ ] **Step 2: Verify RED**

Run the focused test and require failure on the current generic checkmark implementation.

- [ ] **Step 3: Implement the symbol system**

Add the shared step icon, render it in each onboarding stage, and replace generic intro checkmarks with explicit semantic Lucide icons.

- [ ] **Step 4: Verify GREEN**

Run the focused test and existing onboarding/auth tests and require all assertions to pass.

### Task 3: Full verification and delivery

**Files:**
- Review: all modified files.

- [ ] **Step 1: Run automated verification**

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`; require exit code 0 for each.

- [ ] **Step 2: Browser-check the real layouts**

Verify `/signup` and `/onboarding` at desktop and 390px mobile widths. Confirm strength progression is visible, symbols remain aligned, controls are clickable, and no horizontal overflow appears.

- [ ] **Step 3: Commit and push**

Commit only the scoped source, test, spec, and plan files on `main`, preserve unrelated `.claude/settings.json`, and push `main` to `origin`.
