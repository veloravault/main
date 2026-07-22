# Onboarding Welcome Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current two-step onboarding with a polished, framer-motion-animated welcome flow - two branded intro screens, then the existing avatar and master-key steps, then a success state - reusing the existing style system and preserving every security guarantee.

**Architecture:** A new client component `OnboardingFlow` owns the whole staged experience (step index, direction, progress dots, per-step heading, directional `AnimatePresence`) and holds ALL security-critical logic migrated from the retired `OnboardingForm`. Intro/avatar/master-key/completion bodies are presentational sub-components under `onboarding-steps/`. `AuthShell` is untouched (login/signup keep it). The server-side gate in `onboarding/page.tsx` is unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, framer-motion ^12, lucide-react ^1.24, CSS Modules. Tests via `node --test tests/*.test.mjs` (Node's built-in runner; existing tests assert on source via `readFileSync` - no DOM harness exists in this repo).

## Global Constraints

- **Master key never leaves the client form.** No storage APIs (`localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`) may appear in `OnboardingFlow.tsx` - cookie access stays inside `src/lib/planIntent.ts` helpers.
- **Completion request shape is contract-bound:** the server (`src/app/api/onboarding/complete/route.ts`) rejects any body that isn't exactly `{ completed: true, expectedUserId }` (two keys). Do not add fields.
- **Ordering is a security invariant:** live identity re-check (`supabase.auth.getUser()`) → durable activation (`fetch("/api/onboarding/complete")`) → local key handoff (`setMasterKey`). Never reorder.
- **Avatar persistence is non-fatal:** a failed `updateUser` must only `console.error`, never block activation.
- **Reuse `--auth-*` tokens** from `auth-shell.module.css`; introduce no new color tokens or visual language.
- **Respect `prefers-reduced-motion`** via framer-motion's `useReducedMotion()` - collapse slides to opacity-only.
- **Reference signatures (verbatim, do not change):**
  - `useVaultKey().setMasterKey(value: string, expectedUserId: string): boolean`
  - `getStrength(value: string): { level: StrengthLevel; score: number; label: string }` where `StrengthLevel = "weak" | "fair" | "strong" | "very-strong"`, from `@/lib/passwordHealth`.
  - `PresetAvatar({ kind, name, email, className, title })`, `type AvatarKind = "male" | "female"`, from `@/components/PresetAvatar`.
  - `readPlanIntentCookie(): PlanIntent | null`, `clearPlanIntentCookie(): void`, `PlanIntent = { plan: "plus"|"family"; period: "monthly"|"yearly" }`, from `@/lib/planIntent`.
  - `PublicPageShell({ children })` from `@/components/dreelio/PublicPageShell`.

---

## Pre-existing condition (read before starting)

`tests/invite-onboarding.test.mjs` test #1 (`"onboarding only sets the master key…"`) currently **FAILS** on `main`: line 25 asserts `router.replace(["']\/vault["']\)` but the plan-intent commit changed the call to a ternary `router.replace(intent ? \`/vault?upgrade=…\` : "/vault")`. Task 4 updates this test to target the new file AND fixes this stale assertion. Do not treat the initial red as caused by your changes - verify with the baseline step below.

- [ ] **Baseline: confirm current test state**

Run: `node --test tests/invite-onboarding.test.mjs`
Expected: test #1 FAILS on the `router.replace` assertion; tests #2–#5 PASS. Record this.

---

## File Structure

**Create**
- `src/components/auth/onboarding.module.css` - progress dots, intro layout, icon badge (new classes only).
- `src/components/auth/onboarding-steps/onboardingSteps.ts` - the ordered step model + intro screen content constants + motion variants (shared, no JSX).
- `src/components/auth/onboarding-steps/IntroScreen.tsx` - presentational value-prop screen.
- `src/components/auth/onboarding-steps/AvatarStep.tsx` - presentational avatar picker body.
- `src/components/auth/onboarding-steps/MasterKeyStep.tsx` - presentational master-key form body.
- `src/components/auth/onboarding-steps/CompletionStep.tsx` - presentational success state.
- `src/components/auth/OnboardingFlow.tsx` - orchestrator; owns state, motion, progress, and all security logic.

**Modify**
- `src/app/onboarding/page.tsx` - swap `AuthShell` + `OnboardingForm` for `PublicPageShell` + `OnboardingFlow`.
- `tests/invite-onboarding.test.mjs` - retarget test #1 to `OnboardingFlow.tsx`; fix the stale redirect assertion.

**Delete**
- `src/components/auth/OnboardingForm.tsx` - logic migrated.

---

## Task 1: Step model, content constants, and motion variants

Pure data/logic module - no React, no JSX - so it can be reasoned about and referenced by every later task.

**Files:**
- Create: `src/components/auth/onboarding-steps/onboardingSteps.ts`
- Create: `tests/onboarding-flow.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type OnboardingStepId = "vault" | "security" | "avatar" | "master-key" | "done"`
  - `const ONBOARDING_STEPS: readonly OnboardingStepId[]` (in that exact order)
  - `const STEP_HEADINGS: Record<OnboardingStepId, { eyebrow: string; title: string; description: string }>`
  - `const INTRO_CONTENT: Record<"vault" | "security", { icon: "vault" | "shield"; bullets: string[] }>`
  - `const FIRST_INTERACTIVE_INDEX: number` (index of `"avatar"` - the skip-intro target)
  - `function stepVariants(reduceMotion: boolean): Variants` (framer-motion variants with a `custom` direction)

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding-flow.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const file = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(file(path), "utf8");

test("step model lists the five steps in flow order with avatar as the skip target", () => {
  const path = "src/components/auth/onboarding-steps/onboardingSteps.ts";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  // Exact ordered step ids.
  assert.match(source, /"vault",\s*"security",\s*"avatar",\s*"master-key",\s*"done"/);
  // Skip-intro must jump to the first interactive step (avatar).
  assert.match(source, /FIRST_INTERACTIVE_INDEX\s*=\s*ONBOARDING_STEPS\.indexOf\("avatar"\)/);
  // Headings exist for every step id.
  for (const id of ["vault", "security", "avatar", "master-key", "done"]) {
    assert.match(source, new RegExp(`"${id}"\\s*:\\s*\\{`), `heading for ${id}`);
  }
  // Intro content only for the two intro steps.
  assert.match(source, /INTRO_CONTENT[\s\S]*"vault"[\s\S]*"security"/);
  // Motion respects reduced motion (opacity-only path).
  assert.match(source, /reduceMotion/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/onboarding-flow.test.mjs`
Expected: FAIL - file `onboardingSteps.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/components/auth/onboarding-steps/onboardingSteps.ts`:

```typescript
import type { Variants } from "framer-motion";

export type OnboardingStepId = "vault" | "security" | "avatar" | "master-key" | "done";

export const ONBOARDING_STEPS: readonly OnboardingStepId[] = [
  "vault", "security", "avatar", "master-key", "done",
];

export const FIRST_INTERACTIVE_INDEX = ONBOARDING_STEPS.indexOf("avatar");

export const STEP_HEADINGS: Record<OnboardingStepId, { eyebrow: string; title: string; description: string }> = {
  vault: {
    eyebrow: "Welcome to Velora",
    title: "Everything worth protecting, in one vault.",
    description: "Passwords and important documents live together - encrypted end to end, readable only by you.",
  },
  security: {
    eyebrow: "Zero-knowledge",
    title: "Only you can open your vault.",
    description: "Your master key decrypts your vault in this browser alone. We never receive it, store it, or have any way to recover it.",
  },
  avatar: {
    eyebrow: "Make it yours",
    title: "Pick a profile look.",
    description: "Choose an avatar now, or skip and we'll use your initials.",
  },
  "master-key": {
    eyebrow: "Last step",
    title: "Set your master key.",
    description: "This is the key that unlocks your vault. Choose something strong you won't forget.",
  },
  done: {
    eyebrow: "All set",
    title: "Your vault is ready.",
    description: "Taking you in…",
  },
};

export const INTRO_CONTENT: Record<"vault" | "security", { icon: "vault" | "shield"; bullets: string[] }> = {
  vault: {
    icon: "vault",
    bullets: [
      "Logins, cards, and secure notes in one place",
      "Attach and store important documents",
      "Encrypted end to end - even from us",
    ],
  },
  security: {
    icon: "shield",
    bullets: [
      "Your master key never leaves this browser",
      "Not sent, not stored, not logged",
      "If you lose it, no one - including us - can recover your vault",
    ],
  },
};

// Directional slide+fade. `custom` is the direction: 1 = forward, -1 = back.
// Under reduced motion we collapse to opacity only.
export function stepVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return {
    enter: (direction: number) => ({ opacity: 0, x: direction * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (direction: number) => ({ opacity: 0, x: -direction * 40 }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/onboarding-flow.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/onboarding-steps/onboardingSteps.ts tests/onboarding-flow.test.mjs
git commit -m "feat(onboarding): add step model, content, and motion variants"
```

---

## Task 2: Presentational step components

Four dumb components that render UI from props. No state, no network, no crypto - that all stays in the orchestrator (Task 3). This keeps the security surface in one file and makes these safe to hold in context.

**Files:**
- Create: `src/components/auth/onboarding-steps/IntroScreen.tsx`
- Create: `src/components/auth/onboarding-steps/AvatarStep.tsx`
- Create: `src/components/auth/onboarding-steps/MasterKeyStep.tsx`
- Create: `src/components/auth/onboarding-steps/CompletionStep.tsx`
- Modify: `tests/onboarding-flow.test.mjs`

**Interfaces:**
- Consumes: `INTRO_CONTENT` from Task 1; `PresetAvatar`/`AvatarKind`; `getStrength`/`StrengthLevel`; `auth-shell.module.css` + `onboarding.module.css` classes.
- Produces:
  - `IntroScreen({ icon, bullets }: { icon: "vault" | "shield"; bullets: string[] })`
  - `AvatarStep({ selected, onSelect }: { selected: AvatarKind | null; onSelect: (kind: AvatarKind | null) => void })`
  - `MasterKeyStep({ masterKey, confirmation, onMasterKeyChange, onConfirmationChange, strength, submitting }: { masterKey: string; confirmation: string; onMasterKeyChange: (v: string) => void; onConfirmationChange: (v: string) => void; strength: { level: StrengthLevel; score: number; label: string }; submitting: boolean })`
  - `CompletionStep()`

Note: `MasterKeyStep` is presentational only. It renders the two inputs (ids `onboarding-master-key`, `onboarding-master-key-confirmation`) and the strength meter, but performs NO validation and NO submit - the parent `<form>` in the orchestrator owns `onSubmit`. `onboarding.module.css` is created in Task 5; import it now (an empty/partial module is fine until then - components only reference class names).

- [ ] **Step 1: Write the failing test** (append to `tests/onboarding-flow.test.mjs`)

```javascript
test("presentational step components exist and stay logic-free", () => {
  const steps = {
    intro: "src/components/auth/onboarding-steps/IntroScreen.tsx",
    avatar: "src/components/auth/onboarding-steps/AvatarStep.tsx",
    masterKey: "src/components/auth/onboarding-steps/MasterKeyStep.tsx",
    completion: "src/components/auth/onboarding-steps/CompletionStep.tsx",
  };
  for (const path of Object.values(steps)) {
    assert.equal(existsSync(file(path)), true, `${path} must exist`);
  }
  // No security-critical logic may live in the presentational layer.
  for (const path of Object.values(steps)) {
    const source = read(path);
    assert.doesNotMatch(source, /supabase|fetch\(|setMasterKey|onboarding\/complete|PlanIntent/i, `${path} must stay presentational`);
  }
  // MasterKeyStep exposes the two known input ids and defers submit to the parent.
  const masterKey = read(steps.masterKey);
  assert.match(masterKey, /id="onboarding-master-key"/);
  assert.match(masterKey, /id="onboarding-master-key-confirmation"/);
  assert.doesNotMatch(masterKey, /onSubmit|masterKeyConfirmation\s*!==|preventDefault/);
  // AvatarStep offers both preset kinds and a clear (skip) affordance.
  const avatar = read(steps.avatar);
  assert.match(avatar, /"male"[\s\S]*"female"/);
  assert.match(avatar, /onSelect\(null\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/onboarding-flow.test.mjs`
Expected: FAIL - the four component files do not exist.

- [ ] **Step 3: Write the implementations**

Create `src/components/auth/onboarding-steps/IntroScreen.tsx`:

```tsx
"use client";

import { VaultIcon, ShieldCheckIcon, CheckIcon } from "lucide-react";
import shell from "@/components/auth/auth-shell.module.css";
import styles from "@/components/auth/onboarding.module.css";

const ICONS = { vault: VaultIcon, shield: ShieldCheckIcon } as const;

export function IntroScreen({ icon, bullets }: { icon: "vault" | "shield"; bullets: string[] }) {
  const Icon = ICONS[icon];
  return (
    <div className={shell.formStack}>
      <span className={styles.introBadge} aria-hidden="true">
        <Icon width={26} height={26} />
      </span>
      <ul className={styles.introList}>
        {bullets.map((line) => (
          <li key={line} className={styles.introItem}>
            <CheckIcon width={16} height={16} aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Create `src/components/auth/onboarding-steps/AvatarStep.tsx`:

```tsx
"use client";

import { PresetAvatar, type AvatarKind } from "@/components/PresetAvatar";
import shell from "@/components/auth/auth-shell.module.css";

export function AvatarStep({
  selected,
  onSelect,
}: {
  selected: AvatarKind | null;
  onSelect: (kind: AvatarKind | null) => void;
}) {
  return (
    <div className={shell.avatarChoiceGrid}>
      {(["male", "female"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          className={shell.avatarChoice}
          aria-pressed={selected === kind}
          onClick={() => onSelect(selected === kind ? null : kind)}
        >
          <span className={shell.avatarChoicePreview}><PresetAvatar kind={kind} /></span>
          {kind === "male" ? "Male" : "Female"}
        </button>
      ))}
    </div>
  );
}
```

Create `src/components/auth/onboarding-steps/MasterKeyStep.tsx`:

```tsx
"use client";

import type { StrengthLevel } from "@/lib/passwordHealth";
import shell from "@/components/auth/auth-shell.module.css";

const STRENGTH_COLOR_VAR: Record<StrengthLevel, string> = {
  weak: "var(--auth-red)",
  fair: "var(--auth-amber)",
  strong: "var(--auth-blue)",
  "very-strong": "var(--auth-green)",
};

export function MasterKeyStep({
  masterKey,
  confirmation,
  onMasterKeyChange,
  onConfirmationChange,
  strength,
  submitting,
}: {
  masterKey: string;
  confirmation: string;
  onMasterKeyChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  strength: { level: StrengthLevel; score: number; label: string };
  submitting: boolean;
}) {
  return (
    <div className={shell.fieldGroup}>
      <label className={shell.field} htmlFor="onboarding-master-key">
        <span className={shell.fieldLabel}>Vault master key</span>
        <input
          id="onboarding-master-key"
          type="password"
          autoComplete="off"
          value={masterKey}
          onChange={(event) => onMasterKeyChange(event.target.value)}
          disabled={submitting}
          required
        />
        <small className={shell.fieldHint}>Never sent, stored, logged, or added to your account.</small>
        {masterKey && (
          <div className={shell.strengthMeter} aria-live="polite">
            <span className={shell.strengthTrack}>
              <span
                className={shell.strengthFill}
                style={{ width: `${strength.score}%`, backgroundColor: STRENGTH_COLOR_VAR[strength.level] }}
              />
            </span>
            <span className={shell.strengthLabel} style={{ color: STRENGTH_COLOR_VAR[strength.level] }}>
              {strength.label}
            </span>
          </div>
        )}
      </label>
      <label className={shell.field} htmlFor="onboarding-master-key-confirmation">
        <span className={shell.fieldLabel}>Confirm master key</span>
        <input
          id="onboarding-master-key-confirmation"
          type="password"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          disabled={submitting}
          required
        />
      </label>
    </div>
  );
}
```

Create `src/components/auth/onboarding-steps/CompletionStep.tsx`:

```tsx
"use client";

import { CheckIcon } from "lucide-react";
import shell from "@/components/auth/auth-shell.module.css";

export function CompletionStep() {
  return (
    <div className={shell.completion}>
      <span className={shell.completionMark}><CheckIcon width={26} height={26} aria-hidden="true" /></span>
      <h2>Your vault is ready.</h2>
      <p>Taking you in…</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/onboarding-flow.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/onboarding-steps/IntroScreen.tsx src/components/auth/onboarding-steps/AvatarStep.tsx src/components/auth/onboarding-steps/MasterKeyStep.tsx src/components/auth/onboarding-steps/CompletionStep.tsx tests/onboarding-flow.test.mjs
git commit -m "feat(onboarding): add presentational step components"
```

---

## Task 3: OnboardingFlow orchestrator

The heart of the feature. Owns step index + direction, the progress dots, the directional `AnimatePresence`, the per-step heading and footer controls, and ALL security-critical logic migrated verbatim-in-behavior from `OnboardingForm`.

**Files:**
- Create: `src/components/auth/OnboardingFlow.tsx`
- Modify: `tests/onboarding-flow.test.mjs`

**Interfaces:**
- Consumes: Task 1 (`ONBOARDING_STEPS`, `FIRST_INTERACTIVE_INDEX`, `STEP_HEADINGS`, `INTRO_CONTENT`, `stepVariants`, `OnboardingStepId`); Task 2 components; `useVaultKey`, `supabase`, `getStrength`, `readPlanIntentCookie`/`clearPlanIntentCookie`, `useRouter`.
- Produces: `OnboardingFlow({ userId, email }: { userId: string; email: string })`.

Behavioral requirements (all preserved from `OnboardingForm`):
- Master-key step is a real `<form>` whose `onSubmit` runs `completeOnboarding`.
- `completeOnboarding`: guard empty key → guard `strength.level === "weak"` → guard `masterKey !== masterKeyConfirmation` → set submitting → `supabase.auth.getUser()` identity re-check → non-fatal avatar `updateUser` → `fetch("/api/onboarding/complete", { completed: true, expectedUserId: userId })` → `setMasterKey(masterKey, userId)` → clear both fields → read+clear plan intent → advance to `done` → `router.replace(intent ? ... : "/vault")` → `router.refresh()`.
- On any thrown error: show message in the alert region, re-enable submit, stay on master-key step.
- Navigation: `goNext`/`goBack` set direction then index; intro steps show Continue + "Skip setup intro" (jumps to `FIRST_INTERACTIVE_INDEX`); avatar shows Continue + Back + "Skip - use my initials"; master-key shows submit + Back.

- [ ] **Step 1: Write the failing test** (append to `tests/onboarding-flow.test.mjs`)

```javascript
test("orchestrator preserves the onboarding security contract", () => {
  const path = "src/components/auth/OnboardingFlow.tsx";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  // No password sign-in logic, no storage APIs, no stray password input id.
  assert.doesNotMatch(source, /getExpectedUserAuthorization|updateExpectedUserPassword/);
  assert.doesNotMatch(source, /type="password"[^>]*id="onboarding-password"/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);

  // Validation + contract payload + key handoff + field clearing.
  assert.match(source, /if\s*\(masterKey\s*!==\s*masterKeyConfirmation\)/);
  assert.match(source, /JSON\.stringify\(\{\s*completed:\s*true,\s*expectedUserId:\s*userId\s*\}\)/);
  assert.doesNotMatch(source, /JSON\.stringify\([^)]*(?:masterKey|masterPassword)/s);
  assert.match(source, /setMasterKey\(masterKey,\s*userId\)/);
  assert.match(source, /setMasterKeyValue\(["']{2}\)/);
  assert.match(source, /setMasterKeyConfirmation\(["']{2}\)/);

  // Plan-intent redirect (ternary form) with a literal /vault fallback.
  assert.match(source, /router\.replace\(\s*intent\s*\?/);
  assert.match(source, /:\s*["']\/vault["']\)/);

  // Ordering invariant: identity re-check -> activation -> key handoff.
  const liveRecheckIndex = source.indexOf("supabase.auth.getUser()");
  const activationIndex = source.indexOf('fetch("/api/onboarding/complete"');
  const keyIndex = source.indexOf("setMasterKey(masterKey");
  assert.ok(liveRecheckIndex >= 0 && liveRecheckIndex < activationIndex, "identity must be checked before activation");
  assert.ok(activationIndex < keyIndex, "activation must precede the local key handoff");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/onboarding-flow.test.mjs`
Expected: FAIL - `OnboardingFlow.tsx` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/components/auth/OnboardingFlow.tsx`:

```tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { supabase } from "@/lib/supabase";
import { getStrength } from "@/lib/passwordHealth";
import { type AvatarKind } from "@/components/PresetAvatar";
import { clearPlanIntentCookie, readPlanIntentCookie } from "@/lib/planIntent";
import {
  ONBOARDING_STEPS,
  FIRST_INTERACTIVE_INDEX,
  STEP_HEADINGS,
  INTRO_CONTENT,
  stepVariants,
  type OnboardingStepId,
} from "@/components/auth/onboarding-steps/onboardingSteps";
import { IntroScreen } from "@/components/auth/onboarding-steps/IntroScreen";
import { AvatarStep } from "@/components/auth/onboarding-steps/AvatarStep";
import { MasterKeyStep } from "@/components/auth/onboarding-steps/MasterKeyStep";
import { CompletionStep } from "@/components/auth/onboarding-steps/CompletionStep";
import shell from "@/components/auth/auth-shell.module.css";
import styles from "@/components/auth/onboarding.module.css";

export function OnboardingFlow({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { setMasterKey } = useVaultKey();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [avatarKind, setAvatarKind] = useState<AvatarKind | null>(null);
  const [masterKey, setMasterKeyValue] = useState("");
  const [masterKeyConfirmation, setMasterKeyConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const step: OnboardingStepId = ONBOARDING_STEPS[index];
  const heading = STEP_HEADINGS[step];
  const masterKeyStrength = useMemo(() => getStrength(masterKey), [masterKey]);
  const variants = stepVariants(Boolean(reduceMotion));

  function goTo(nextIndex: number, dir: number) {
    setError("");
    setDirection(dir);
    setIndex(nextIndex);
  }
  const goNext = () => goTo(Math.min(index + 1, ONBOARDING_STEPS.length - 1), 1);
  const goBack = () => goTo(Math.max(index - 1, 0), -1);
  const skipIntro = () => goTo(FIRST_INTERACTIVE_INDEX, 1);

  async function completeOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!masterKey) {
      setError("Choose a vault master key.");
      return;
    }
    if (masterKeyStrength.level === "weak") {
      setError("Your master key is too weak. Use a longer key with a mix of letters, numbers, and symbols - it's the only thing protecting your vault.");
      return;
    }
    if (masterKey !== masterKeyConfirmation) {
      setError("The master key confirmation does not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: liveIdentity, error: liveIdentityError } = await supabase.auth.getUser();
      if (liveIdentityError || liveIdentity.user?.id !== userId) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }

      // Persist the avatar choice (skippable → initials fallback). Non-fatal.
      if (avatarKind) {
        const { error: metadataError } = await supabase.auth.updateUser({ data: { avatar_kind: avatarKind } });
        if (metadataError) console.error("Could not save avatar choice:", metadataError.message);
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, expectedUserId: userId }),
      });
      if (!response.ok) throw new Error("Your account could not be activated. Please try again.");

      if (!setMasterKey(masterKey, userId)) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }

      setMasterKeyValue("");
      setMasterKeyConfirmation("");

      // Advance to the success state before navigating.
      setDirection(1);
      setIndex(ONBOARDING_STEPS.indexOf("done"));

      // If they picked a paid plan on the pricing page before signing up,
      // land straight in checkout instead of the plain dashboard.
      const intent = readPlanIntentCookie();
      clearPlanIntentCookie();
      router.replace(intent ? `/vault?upgrade=${intent.plan}&period=${intent.period}` : "/vault");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Setup could not be completed. Try again.");
      setSubmitting(false);
    }
  }

  const totalDots = ONBOARDING_STEPS.length - 1; // exclude the terminal "done" state

  return (
    <main className={shell.page}>
      <motion.section
        className={`${shell.stage} ${shell.compact}`}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        {step !== "done" && (
          <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={totalDots} aria-valuenow={index + 1}>
            {ONBOARDING_STEPS.slice(0, totalDots).map((id, dotIndex) => (
              <span key={id} className={styles.dotTrack}>
                {dotIndex === index && <motion.span layoutId="onboarding-dot" className={styles.dotActive} />}
                <span className={styles.dot} data-filled={dotIndex < index} />
              </span>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.header
            key={`heading-${step}`}
            className={shell.heading}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <p className={shell.eyebrow}>{heading.eyebrow}</p>
            <h1>{heading.title}</h1>
            <p>{heading.description}</p>
          </motion.header>
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={`content-${step}`}
            className={shell.content}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 34 }}
          >
            {step === "vault" && <IntroScreen icon={INTRO_CONTENT.vault.icon} bullets={INTRO_CONTENT.vault.bullets} />}
            {step === "security" && <IntroScreen icon={INTRO_CONTENT.security.icon} bullets={INTRO_CONTENT.security.bullets} />}

            {step === "avatar" && (
              <div className={shell.formStack}>
                <p className={shell.invitedEmail}>Signed up as <strong>{email}</strong></p>
                <AvatarStep selected={avatarKind} onSelect={setAvatarKind} />
                <button className={shell.primaryAction} type="button" onClick={goNext}>
                  <span>Continue</span>
                  <ArrowRightIcon width={17} height={17} aria-hidden="true" />
                </button>
                <div className={styles.stepFooter}>
                  <button type="button" className={shell.secondaryAction} onClick={goBack}>Back</button>
                  <button type="button" className={shell.textLink} onClick={() => { setAvatarKind(null); goNext(); }}>
                    Skip - use my initials
                  </button>
                </div>
              </div>
            )}

            {step === "master-key" && (
              <form className={shell.formStack} onSubmit={completeOnboarding} noValidate>
                <MasterKeyStep
                  masterKey={masterKey}
                  confirmation={masterKeyConfirmation}
                  onMasterKeyChange={setMasterKeyValue}
                  onConfirmationChange={setMasterKeyConfirmation}
                  strength={masterKeyStrength}
                  submitting={submitting}
                />
                {error && <p className={shell.alert} role="alert">{error}</p>}
                <button className={shell.primaryAction} type="submit" disabled={submitting}>
                  <span>{submitting ? "Setting up your vault…" : "Set master key"}</span>
                  <ArrowRightIcon width={17} height={17} aria-hidden="true" />
                </button>
                <div className={styles.stepFooter}>
                  <button type="button" className={shell.secondaryAction} onClick={goBack} disabled={submitting}>Back</button>
                </div>
                <p className={shell.securityNote}>The master key leaves this form only for local, in-memory vault access.</p>
              </form>
            )}

            {step === "done" && <CompletionStep />}
          </motion.div>
        </AnimatePresence>

        {(step === "vault" || step === "security") && (
          <div className={shell.formStack}>
            <button className={shell.primaryAction} type="button" onClick={goNext}>
              <span>Continue</span>
              <ArrowRightIcon width={17} height={17} aria-hidden="true" />
            </button>
            <div className={styles.stepFooter}>
              {step === "security"
                ? <button type="button" className={shell.secondaryAction} onClick={goBack}>Back</button>
                : <span />}
              <button type="button" className={shell.textLink} onClick={skipIntro}>Skip setup intro</button>
            </div>
          </div>
        )}
      </motion.section>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/onboarding-flow.test.mjs`
Expected: PASS (all three onboarding-flow tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/OnboardingFlow.tsx tests/onboarding-flow.test.mjs
git commit -m "feat(onboarding): add animated OnboardingFlow orchestrator"
```

---

## Task 4: Styles, page wiring, retire OnboardingForm, fix the security test

Ties it together: the CSS module the components already reference, the page swap, deletion of the old form, and retargeting the existing security test (which also fixes its pre-existing red).

**Files:**
- Create: `src/components/auth/onboarding.module.css`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `tests/invite-onboarding.test.mjs`
- Delete: `src/components/auth/OnboardingForm.tsx`

**Interfaces:**
- Consumes: `OnboardingFlow` (Task 3), `PublicPageShell`.
- Produces: nothing new.

- [ ] **Step 1: Update the security test to target the new file, then run it (fails)**

In `tests/invite-onboarding.test.mjs`, in test #1 (`"onboarding only sets the master key…"`):
- Change the path constant from `"src/components/auth/OnboardingForm.tsx"` to `"src/components/auth/OnboardingFlow.tsx"`.
- Replace the stale redirect assertion `assert.match(source, /router\.replace\(["']\/vault["']\)/);` with the two-line ternary-aware check:

```javascript
  assert.match(source, /router\.replace\(\s*intent\s*\?/);
  assert.match(source, /:\s*["']\/vault["']\)/);
```

Run: `node --test tests/invite-onboarding.test.mjs`
Expected: test #1 now reads `OnboardingFlow.tsx` (which exists from Task 3) and PASSES; tests #2–#5 still PASS. (If `OnboardingForm.tsx` still exists, that's fine - it's deleted in Step 4.)

- [ ] **Step 2: Create the CSS module**

Create `src/components/auth/onboarding.module.css`:

```css
/* Onboarding-specific pieces. Colors come from the --auth-* tokens defined on
   .page / .modalCard in auth-shell.module.css (this module renders inside .page). */

.progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 auto 20px;
}

.dotTrack { position: relative; display: grid; place-items: center; width: 22px; height: 8px; }

.dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--auth-fill);
  transition: background-color 180ms ease;
}
.dot[data-filled="true"] { background: color-mix(in srgb, var(--auth-blue) 55%, var(--auth-fill)); }

.dotActive {
  position: absolute;
  inset: 0;
  width: 22px;
  height: 8px;
  border-radius: 999px;
  background: var(--auth-blue);
}

.introBadge {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  margin: 0 auto;
  border-radius: 18px;
  background: color-mix(in srgb, var(--auth-blue) 12%, transparent);
  color: var(--auth-blue);
}

.introList { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }

.introItem {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: start;
  padding: 13px 15px;
  border: 1px solid var(--auth-line);
  border-radius: 13px;
  background: var(--auth-field);
  color: var(--auth-ink);
  font-size: 14px;
  line-height: 1.4;
  letter-spacing: -0.01em;
}
.introItem svg { margin-top: 1px; color: var(--auth-blue); }

.stepFooter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.stepFooter:only-child { justify-content: center; }

@media (prefers-reduced-motion: reduce) {
  .dot, .dotActive { transition-duration: 0.01ms; }
}
```

- [ ] **Step 3: Wire the page**

Replace the render in `src/app/onboarding/page.tsx`. Keep the server gate (lines 15–39) exactly as-is. Replace the import of `AuthShell`/`OnboardingForm` and the returned JSX:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/auth/OnboardingFlow";
import { PublicPageShell } from "@/components/dreelio/PublicPageShell";
import { AuthorizationError, getMembershipForUser, requireUser } from "@/lib/server/access";

export const metadata: Metadata = {
  title: "Set up your vault - Velora Vault",
  description: "Set up your Velora Vault.",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof AuthorizationError && error.code === "UNAUTHENTICATED") {
      redirect("/login?next=/vault");
    }
    throw error;
  }

  const membership = await getMembershipForUser(user.id);
  if (membership?.status === "active") redirect("/vault");
  switch (membership?.status) {
    case "invited":
      break;
    case "suspended":
      redirect("/login?state=suspended");
      break;
    case "revoked":
      redirect("/login?state=revoked");
      break;
    default:
      redirect("/signup?state=setup-incomplete");
  }

  return (
    <PublicPageShell>
      <OnboardingFlow userId={user.id} email={user.email ?? "your account email"} />
    </PublicPageShell>
  );
}
```

- [ ] **Step 4: Delete the retired form**

```bash
git rm src/components/auth/OnboardingForm.tsx
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests PASS across `tests/*.test.mjs` (including `invite-onboarding` #1 now green against `OnboardingFlow.tsx`, and the three `onboarding-flow` tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/onboarding.module.css src/app/onboarding/page.tsx tests/invite-onboarding.test.mjs
git commit -m "feat(onboarding): wire animated flow into page, retire OnboardingForm"
```

---

## Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck + lint + build**

Run: `npm run lint`
Expected: no errors in the new/modified files.

Run: `npm run build`
Expected: build succeeds - no unused imports (confirm `AuthShell` is no longer imported by `page.tsx`), no type errors, no missing CSS-module classes.

- [ ] **Step 2: Confirm no dangling references to the retired component**

Run: `grep -rn "OnboardingForm" src tests`
Expected: no matches.

- [ ] **Step 3: Drive the real flow (verify skill)**

Use the `verify` skill (or `npm run dev`) to exercise the flow in a real browser as an `invited` user:
- Intro screens advance/back; progress dots animate; "Skip setup intro" jumps to the avatar step.
- Avatar select/deselect works; "Skip - use my initials" advances.
- Master key: weak key blocked; mismatch blocked; valid key completes, shows the success state, and lands on `/vault` (or `/vault?upgrade=…&period=…` when a plan-intent cookie is set).
- Toggle OS "Reduce Motion" and confirm transitions collapse to fades with no layout jump.
- Reload the page after activation → server gate redirects to `/vault` (confirms the gate still governs).

- [ ] **Step 4: Final commit (if verification prompted any fixes)**

```bash
git add -A
git commit -m "fix(onboarding): address verification findings"
```

---

## Self-Review

**Spec coverage:**
- Two intro screens (vault, security) → Task 1 content + Task 2 `IntroScreen` + Task 3 rendering. ✓
- Existing avatar + master-key steps preserved → Task 2 `AvatarStep`/`MasterKeyStep` + Task 3 logic. ✓
- Stepped nav with progress + back + directional spring motion + reduced-motion → Task 1 `stepVariants` + Task 3 `AnimatePresence`/dots. ✓
- Completion state → Task 2 `CompletionStep` + Task 3 `done` step. ✓
- Dedicated `OnboardingFlow`, `AuthShell` untouched, `PublicPageShell` host, `OnboardingForm` retired → Tasks 3–4. ✓
- Server gate unchanged; master-key/identity/activation/redirect preserved → Task 3 behavioral requirements + Task 4 test. ✓
- Style via `--auth-*` tokens, new classes in `onboarding.module.css` → Task 4. ✓
- Tests: server contract stays green (retargeted) + new structural/security tests → Tasks 1–4. ✓ (Note: repo has no DOM test harness; runtime behavior like skip-navigation and reduced-motion is verified via the `verify` skill in Task 5, per the spec's "where the harness supports it" caveat.)

**Placeholder scan:** No TBD/TODO/"handle edge cases"/vague steps - every code step contains full code. ✓

**Type consistency:** `setMasterKey(value, expectedUserId): boolean`, `getStrength → { level, score, label }`, `AvatarKind`, `PlanIntent`, and the Task 1→2→3 exports (`ONBOARDING_STEPS`, `FIRST_INTERACTIVE_INDEX`, `STEP_HEADINGS`, `INTRO_CONTENT`, `stepVariants`, `OnboardingStepId`) are named identically across tasks. ✓
