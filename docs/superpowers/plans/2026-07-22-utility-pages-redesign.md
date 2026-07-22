# Utility Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Velora Vault's four public utility routes around a shared, responsive secure-workbench system while preserving local-only secure generation and strength analysis.

**Architecture:** Keep each `page.tsx` as a Server Component that owns metadata and the existing public shell, and keep interactivity inside focused Client Components. Extract deterministic generator rules into a framework-free TypeScript module, reuse accessible workbench primitives across the four clients, and centralize the complete responsive visual system in the existing CSS module.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.7, TypeScript, CSS Modules, Framer Motion 12, Lucide React, `unique-names-generator`, `zxcvbn`, Node 24 test runner.

## Global Constraints

- Follow `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`, `05-server-and-client-components.md`, `11-css.md`, and `14-metadata-and-og-images.md` for this installed Next.js version.
- Keep the four existing route URLs and their Server Component metadata exports.
- Do not add dependencies, server endpoints, persistence, URL state, or direct vault-saving behavior.
- Generated and tested values must remain local and must never enter analytics, logs, storage, cookies, URLs, Server Actions, or API calls.
- Use `secureRandomInt`/`secureRandomItem`; never use `Math.random()`.
- Preserve light mode, dark mode, keyboard operation, 200% zoom, reduced motion, and a 44px minimum interactive target.
- Inputs must render at 16px or larger on mobile and generated output must never cause horizontal page overflow.
- Use Geist Sans for UI/content and Geist Mono only for generated or analytical values.
- Preserve the existing `PublicPageShell`, global navigation, footer, and `pageMetadata` integration.
- Do not copy Bitwarden branding, awards, statistics, artwork, or page text.

---

## File map

### Create

- `src/app/utilities/generatorLogic.ts` - deterministic password, random-string, passphrase, username, and strength-label rules with injected secure randomness.
- `src/app/utilities/utilityData.ts` - shared route labels, hrefs, and related-tool filtering.
- `src/app/utilities/UtilityPageLayout.tsx` - shared hero, benefit band, educational-section, related-tools, and CTA composition.
- `src/app/utilities/UtilityWorkbench.tsx` - accessible output, range, switch, segmented control, privacy badge, and workbench primitives.
- `src/app/utilities/useUtilityClipboard.ts` - copy success/failure/manual-selection feedback without logging values.
- `tests/utility-generator-logic.test.mjs` - executable logic tests using Node 24 TypeScript stripping.
- `tests/utility-pages-contract.test.mjs` - source-level accessibility, privacy, routing, and responsive-contract tests.

### Replace or substantially modify

- `src/app/utilities/utilities.module.css` - complete shared responsive workbench and content system.
- `src/app/utilities/password-generator/PasswordGeneratorClient.tsx` - password-specific state and controls.
- `src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx` - passphrase-specific state and controls.
- `src/app/utilities/username-generator/UsernameGeneratorClient.tsx` - readable/random-string modes and controls.
- `src/app/utilities/password-strength/PasswordStrengthClient.tsx` - private input and stable zxcvbn result panel.
- The four `page.tsx` files remain unchanged Server Components and are covered by route-contract tests.

---

### Task 1: Extract and test secure generator rules

**Files:**

- Create: `src/app/utilities/generatorLogic.ts`
- Create: `tests/utility-generator-logic.test.mjs`

**Interfaces:**

- Consumes: `RandomInt = (upperBound: number) => number`, supplied as `secureRandomInt` by route clients.
- Produces: `CharacterOptions`, `buildPassword`, `buildRandomString`, `formatPassphrase`, `formatWordUsername`, `toggleCharacterOption`, and `getGeneratorStrength`.

- [ ] **Step 1: Write the failing logic tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPassword,
  buildRandomString,
  formatPassphrase,
  formatWordUsername,
  getGeneratorStrength,
  toggleCharacterOption,
} from "../src/app/utilities/generatorLogic.ts";

const cyclingRandom = () => {
  let value = 0;
  return (upperBound) => value++ % upperBound;
};

test("passwords include every enabled set and preserve requested length", () => {
  const password = buildPassword(
    18,
    { uppercase: true, lowercase: true, numbers: true, special: true },
    cyclingRandom(),
  );
  assert.equal(password.length, 18);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[0-9]/);
  assert.match(password, /[^A-Za-z0-9]/);
});

test("random strings use only enabled sets", () => {
  const value = buildRandomString(
    24,
    { uppercase: false, lowercase: true, numbers: true, special: false },
    cyclingRandom(),
  );
  assert.equal(value.length, 24);
  assert.match(value, /^[a-z0-9]+$/);
});

test("the last character set cannot be disabled", () => {
  const result = toggleCharacterOption(
    { uppercase: false, lowercase: true, numbers: false, special: false },
    "lowercase",
  );
  assert.equal(result.blocked, true);
  assert.equal(result.options.lowercase, true);
});

test("passphrase and readable username formatting is deterministic", () => {
  assert.equal(formatPassphrase(["quiet", "river", "ember"], ".", true, true, () => 7), "Quiet.River.Ember.7");
  assert.equal(formatWordUsername(["silent", "otter"], "-", false, true, () => 42), "silent-otter-42");
});

test("generator strength labels rise with length and variety", () => {
  assert.deepEqual(getGeneratorStrength(8, 1), { label: "Basic", level: 1 });
  assert.deepEqual(getGeneratorStrength(14, 4), { label: "Strong", level: 3 });
  assert.deepEqual(getGeneratorStrength(24, 4), { label: "Excellent", level: 4 });
});
```

- [ ] **Step 2: Run the logic test and verify it fails**

Run: `node --test tests/utility-generator-logic.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `generatorLogic.ts`.

- [ ] **Step 3: Implement the framework-free generator module**

```ts
export const CHARACTER_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  special: "!@#$%^&*()_+~`|}{[]:;?><,./-=",
} as const;

export type CharacterOption = keyof typeof CHARACTER_SETS;
export type CharacterOptions = Record<CharacterOption, boolean>;
export type RandomInt = (upperBound: number) => number;

function selectedSets(options: CharacterOptions): string[] {
  return (Object.keys(CHARACTER_SETS) as CharacterOption[])
    .filter((key) => options[key])
    .map((key) => CHARACTER_SETS[key]);
}

function randomCharacter(characters: string, randomInt: RandomInt): string {
  return characters[randomInt(characters.length)];
}

function secureShuffle(values: string[], randomInt: RandomInt): string[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function buildPassword(length: number, options: CharacterOptions, randomInt: RandomInt): string {
  const sets = selectedSets(options);
  if (sets.length === 0) throw new Error("At least one character set is required");
  if (length < sets.length) throw new Error("Length must fit every enabled character set");
  const characters = sets.map((set) => randomCharacter(set, randomInt));
  const pool = sets.join("");
  while (characters.length < length) characters.push(randomCharacter(pool, randomInt));
  return secureShuffle(characters, randomInt).join("");
}

export function buildRandomString(length: number, options: CharacterOptions, randomInt: RandomInt): string {
  return buildPassword(length, options, randomInt);
}

function titleCase(word: string): string {
  return word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : word;
}

export function formatPassphrase(
  words: string[], separator: string, capitalize: boolean, includeNumber: boolean, randomInt: RandomInt,
): string {
  const formatted = capitalize ? words.map(titleCase) : words.map((word) => word.toLowerCase());
  if (includeNumber) formatted.push(String(randomInt(10)));
  return formatted.join(separator);
}

export function formatWordUsername(
  words: string[], separator: string, capitalize: boolean, includeNumber: boolean, randomInt: RandomInt,
): string {
  const formatted = capitalize ? words.map(titleCase) : words.map((word) => word.toLowerCase());
  if (includeNumber) formatted.push(String(randomInt(1000)));
  return formatted.join(separator);
}

export function toggleCharacterOption(
  options: CharacterOptions,
  key: CharacterOption,
): { options: CharacterOptions; blocked: boolean } {
  const next = { ...options, [key]: !options[key] };
  if (!Object.values(next).some(Boolean)) return { options, blocked: true };
  return { options: next, blocked: false };
}

export function getGeneratorStrength(length: number, enabledSetCount: number): { label: string; level: number } {
  if (length >= 20 && enabledSetCount >= 3) return { label: "Excellent", level: 4 };
  if (length >= 14 && enabledSetCount >= 3) return { label: "Strong", level: 3 };
  if (length >= 10 && enabledSetCount >= 2) return { label: "Good", level: 2 };
  return { label: "Basic", level: 1 };
}
```

- [ ] **Step 4: Run the logic tests**

Run: `node --test tests/utility-generator-logic.test.mjs`

Expected: 5 tests pass.

- [ ] **Step 5: Commit the tested generator rules**

```bash
git add src/app/utilities/generatorLogic.ts tests/utility-generator-logic.test.mjs
git commit -m "test: define secure utility generator rules"
```

---

### Task 2: Build shared accessible utility primitives

**Files:**

- Create: `src/app/utilities/utilityData.ts`
- Create: `src/app/utilities/UtilityPageLayout.tsx`
- Create: `src/app/utilities/UtilityWorkbench.tsx`
- Create: `src/app/utilities/useUtilityClipboard.ts`
- Create: `tests/utility-pages-contract.test.mjs`

**Interfaces:**

- Consumes: route-specific React nodes, `currentSlug`, and utility-specific control state.
- Produces: `UtilityPageLayout`, `UtilityWorkbench`, `UtilityOutput`, `UtilityRange`, `UtilitySwitch`, `UtilitySegments`, `useUtilityClipboard`, and `relatedUtilities(currentSlug)`.

- [ ] **Step 1: Write failing shared-component contract tests**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("shared workbench primitives expose accessible control semantics", () => {
  const source = read("src/app/utilities/UtilityWorkbench.tsx");
  assert.match(source, /type="range"/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /role="switch"/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Local only/);
});

test("clipboard feedback never logs or persists utility values", () => {
  const source = read("src/app/utilities/useUtilityClipboard.ts");
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage|fetch\(|URLSearchParams/);
});

test("related utility links exclude the current route", async () => {
  const { relatedUtilities } = await import("../src/app/utilities/utilityData.ts");
  const links = relatedUtilities("password-generator");
  assert.equal(links.length, 3);
  assert.equal(links.some((link) => link.slug === "password-generator"), false);
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node --test tests/utility-pages-contract.test.mjs`

Expected: FAIL because the shared files do not exist.

- [ ] **Step 3: Implement route data and filtering**

```ts
export const UTILITIES = [
  { slug: "password-generator", label: "Password generator", href: "/utilities/password-generator", description: "Create a strong random password." },
  { slug: "passphrase-generator", label: "Passphrase generator", href: "/utilities/passphrase-generator", description: "Build a memorable multi-word secret." },
  { slug: "username-generator", label: "Username generator", href: "/utilities/username-generator", description: "Create a private online identity." },
  { slug: "password-strength", label: "Password strength tester", href: "/utilities/password-strength", description: "Check a password locally." },
] as const;

export type UtilitySlug = (typeof UTILITIES)[number]["slug"];
export function relatedUtilities(currentSlug: UtilitySlug) {
  return UTILITIES.filter((utility) => utility.slug !== currentSlug);
}
```

- [ ] **Step 4: Implement clipboard feedback with manual-selection fallback**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ClipboardStatus = "idle" | "copied" | "manual";

export function useUtilityClipboard(value: string) {
  const outputRef = useRef<HTMLOutputElement>(null);
  const [status, setStatus] = useState<ClipboardStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const selectOutput = useCallback(() => {
    const node = outputRef.current;
    if (!node) return;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const copy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      selectOutput();
      setStatus("manual");
    }
  }, [selectOutput, value]);

  return { copy, outputRef, status, reset: () => setStatus("idle") };
}
```

- [ ] **Step 5: Implement the shared workbench primitives**

Create typed components with these exact public props and semantics:

```tsx
"use client";

import type { ReactNode, RefObject } from "react";
import { CheckIcon, CopyIcon, LockKeyholeIcon, RefreshCwIcon } from "lucide-react";
import styles from "./utilities.module.css";

export function UtilityWorkbench({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className={styles.workbench} aria-labelledby="utility-workbench-title">
    <header className={styles.workbenchHeader}>
      <div><p className={styles.workbenchKicker}>Free utility</p><h2 id="utility-workbench-title">{title}</h2><p>{description}</p></div>
      <span className={styles.localBadge}><LockKeyholeIcon aria-hidden="true" /> Local only</span>
    </header>
    {children}
  </section>;
}

export function UtilityOutput({ value, label, outputRef, onCopy, onRegenerate, status }: {
  value: string; label: string; outputRef: RefObject<HTMLOutputElement | null>; onCopy: () => void;
  onRegenerate: () => void; status: "idle" | "copied" | "manual";
}) {
  const message = status === "copied" ? `${label} copied` : status === "manual" ? "Copy unavailable. The value is selected; copy it manually." : "";
  return <div className={styles.outputPanel}>
    <span className={styles.outputLabel}>{label}</span>
    <output ref={outputRef} className={styles.outputValue} tabIndex={0}>{value}</output>
    <div className={styles.outputActions}>
      <button type="button" onClick={onRegenerate}><RefreshCwIcon aria-hidden="true" /> Regenerate</button>
      <button type="button" className={styles.copyAction} onClick={onCopy}>{status === "copied" ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />} Copy</button>
    </div>
    <p className={styles.srStatus} aria-live="polite">{message}</p>
  </div>;
}

export function UtilityRange({ id, label, value, min, max, onChange }: {
  id: string; label: string; value: number; min: number; max: number; onChange: (value: number) => void;
}) {
  return <label className={styles.rangeControl} htmlFor={id}>
    <span>{label}<output htmlFor={id}>{value}</output></span>
    <input id={id} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.currentTarget.value))} />
  </label>;
}

export function UtilitySwitch({ id, label, description, checked, onChange }: {
  id: string; label: string; description: string; checked: boolean; onChange: () => void;
}) {
  return <label className={styles.switchControl} htmlFor={id}>
    <span><strong>{label}</strong><small>{description}</small></span>
    <input id={id} type="checkbox" role="switch" checked={checked} onChange={onChange} />
  </label>;
}

export function UtilitySegments<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <div className={styles.segmentControl} role="group" aria-label={label}>
    {options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}
```

- [ ] **Step 6: Implement the shared page composition**

`UtilityPageLayout` must accept the following exact interface and render semantic sections in order: hero, workbench, benefits, education, related tools, CTA.

```tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { LANDING_VIEWPORT, revealVariants, staggerContainer, staggerItem } from "@/components/dreelio/motion";
import { relatedUtilities, type UtilitySlug } from "./utilityData";
import styles from "./utilities.module.css";

export type UtilityBenefit = { eyebrow: string; title: string; description: string; icon: ReactNode };
export type UtilityEducationSection = { eyebrow: string; title: string; body: ReactNode; aside: ReactNode };

export function UtilityPageLayout(props: {
  slug: UtilitySlug;
  title: string;
  description: string;
  workbench: ReactNode;
  benefits: UtilityBenefit[];
  education: UtilityEducationSection[];
  ctaTitle: string;
  ctaDescription: string;
}) {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? undefined : revealVariants(22);
  const related = relatedUtilities(props.slug);

  return <main className={styles.page}>
    <motion.section className={styles.hero} initial={false} animate="show" variants={staggerContainer}>
      <motion.div className={styles.heroCopy} variants={staggerItem}>
        <p className={styles.eyebrow}>Free · Private · Local</p>
        <h1>{props.title}</h1>
        <p>{props.description}</p>
        <a className={styles.jumpLink} href="#utility-workbench-title">Use the tool <ArrowRightIcon aria-hidden="true" /></a>
      </motion.div>
      <motion.div className={styles.heroWorkbench} variants={staggerItem}>{props.workbench}</motion.div>
    </motion.section>

    <section className={styles.benefitGrid} aria-label={`${props.title} benefits`}>
      {props.benefits.map((benefit) => <article className={styles.benefitCard} key={benefit.title}>
        <span className={styles.benefitIcon}>{benefit.icon}</span><p>{benefit.eyebrow}</p><h2>{benefit.title}</h2><p>{benefit.description}</p>
      </article>)}
    </section>

    <div className={styles.education}>
      {props.education.map((section, index) => <motion.section
        className={styles.educationRow}
        key={section.title}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={reveal}
      >
        <div className={styles.educationCopy}><p className={styles.sectionIndex}>{section.eyebrow}</p><h2>{section.title}</h2>{section.body}</div>
        <aside className={styles.educationAside} aria-label={`Example ${index + 1}`}>{section.aside}</aside>
      </motion.section>)}
    </div>

    <section className={styles.relatedSection} aria-labelledby="related-tools-title">
      <p className={styles.sectionIndex}>More local tools</p><h2 id="related-tools-title">Continue your security check.</h2>
      <div className={styles.relatedGrid}>{related.map((utility) => <Link className={styles.relatedCard} href={utility.href} key={utility.slug}>
        <span><strong>{utility.label}</strong><small>{utility.description}</small></span><ArrowRightIcon aria-hidden="true" />
      </Link>)}</div>
    </section>

    <section className={styles.finalCard}>
      <div><p className={styles.eyebrow}>Keep it protected</p><h2>{props.ctaTitle}</h2><p>{props.ctaDescription}</p></div>
      <Link href="/signup" className={styles.primaryAction}>Create your vault <ArrowRightIcon aria-hidden="true" /></Link>
    </section>
  </main>;
}
```

The implementation must use `motion` only for the opening workbench and section reveals, call `useReducedMotion`, use `Link` for internal utility and signup routes, and keep one `h1`.

- [ ] **Step 7: Run the shared contract tests**

Run: `node --test tests/utility-pages-contract.test.mjs`

Expected: 3 tests pass.

- [ ] **Step 8: Commit the shared component system**

```bash
git add src/app/utilities/utilityData.ts src/app/utilities/UtilityPageLayout.tsx src/app/utilities/UtilityWorkbench.tsx src/app/utilities/useUtilityClipboard.ts tests/utility-pages-contract.test.mjs
git commit -m "feat: add shared utility workbench components"
```

---

### Task 3: Replace the utility visual system with responsive CSS

**Files:**

- Modify: `src/app/utilities/utilities.module.css`
- Modify: `tests/utility-pages-contract.test.mjs`

**Interfaces:**

- Consumes: every class referenced by `UtilityPageLayout.tsx`, `UtilityWorkbench.tsx`, and the four route clients.
- Produces: desktop, tablet, mobile, dark-mode, focus-visible, reduced-motion, and overflow behavior without fixed hero heights.

- [ ] **Step 1: Add failing CSS contract assertions**

```js
test("utility styles define responsive, focus, overflow, and reduced-motion safeguards", () => {
  const css = read("src/app/utilities/utilities.module.css");
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /min-height:\s*44px/);
  assert.doesNotMatch(css, /\.hero[\s\S]{0,300}min-height:\s*650px/);
});
```

- [ ] **Step 2: Run the CSS contract test and verify it fails**

Run: `node --test tests/utility-pages-contract.test.mjs`

Expected: FAIL because the old `.hero` still uses a fixed 650px minimum and the new workbench classes do not exist.

- [ ] **Step 3: Replace the CSS module with the secure-workbench system**

Implement these layout invariants exactly:

```css
.page { width: min(calc(100% - 48px), 1120px); margin-inline: auto; padding: 150px 0 112px; }
.hero { display: grid; grid-template-columns: minmax(260px, .68fr) minmax(0, 1.32fr); gap: clamp(40px, 6vw, 80px); align-items: center; }
.hero h1 { max-width: 10ch; margin: 0; color: var(--ink); font-size: clamp(48px, 6vw, 76px); font-weight: 620; letter-spacing: -.055em; line-height: .98; }
.workbench { overflow: hidden; border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--line)); border-radius: 32px; background: color-mix(in srgb, var(--accent) 7%, var(--surface-alt-soft)); box-shadow: 0 28px 72px -52px rgba(0,0,0,.5); }
.workbenchBody { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(280px, .88fr); gap: 1px; background: var(--line); }
.outputValue { display: block; max-width: 100%; overflow-wrap: anywhere; font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: clamp(24px, 3vw, 40px); }
.outputActions button, .primaryAction, .relatedCard { min-height: 44px; }
.workbench button:focus-visible, .workbench input:focus-visible, .relatedCard:focus-visible, .primaryAction:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent) 42%, transparent); outline-offset: 3px; }

@media (max-width: 960px) {
  .hero { grid-template-columns: minmax(230px, .6fr) minmax(0, 1.4fr); gap: 32px; }
  .workbenchBody { grid-template-columns: 1fr; }
  .benefitGrid, .relatedGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 767px) {
  .page { width: min(calc(100% - 32px), 1120px); padding: 116px 0 80px; }
  .hero { grid-template-columns: 1fr; gap: 36px; }
  .hero h1 { font-size: clamp(42px, 13vw, 60px); }
  .workbench { border-radius: 24px; }
  .workbenchHeader, .outputPanel, .controlsPanel { padding: 20px; }
  .benefitGrid, .relatedGrid, .educationRow { grid-template-columns: 1fr; }
  .outputActions { display: grid; grid-template-columns: 1fr; }
  .rangeControl input, .passwordInput { font-size: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .page *, .page *::before, .page *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
```

Define the remaining named contracts in the same module: `.heroCopy`, `.eyebrow`, `.jumpLink`, `.heroWorkbench`, `.workbenchHeader`, `.workbenchKicker`, `.localBadge`, `.outputPanel`, `.outputLabel`, `.outputActions`, `.copyAction`, `.srStatus`, `.controlsPanel`, `.rangeControl`, `.switchControl`, `.segmentControl`, `.benefitGrid`, `.benefitCard`, `.benefitIcon`, `.education`, `.educationRow`, `.educationCopy`, `.educationAside`, `.sectionIndex`, `.relatedSection`, `.relatedGrid`, `.relatedCard`, `.finalCard`, and `.primaryAction`. Use semantic project variables for every surface and text color; give `.srStatus` a visually-hidden treatment; keep `.educationRow` naturally sized; and set `min-width: 0` on grid children so output cannot force horizontal overflow.

- [ ] **Step 4: Run CSS and shared component tests**

Run: `node --test tests/utility-pages-contract.test.mjs`

Expected: 4 tests pass.

- [ ] **Step 5: Commit the responsive visual system**

```bash
git add src/app/utilities/utilities.module.css tests/utility-pages-contract.test.mjs
git commit -m "feat: add responsive utility page visual system"
```

---

### Task 4: Rebuild password and passphrase generators

**Files:**

- Modify: `src/app/utilities/password-generator/PasswordGeneratorClient.tsx`
- Modify: `src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx`
- Modify: `tests/utility-pages-contract.test.mjs`

**Interfaces:**

- Consumes: Task 1 generator functions; Task 2 layout, workbench primitives, and clipboard hook; existing `secureRandomInt`, `secureRandomItem`, dictionaries, and Lucide icons.
- Produces: fully responsive password and passphrase routes with local generation, copy/manual fallback, and accessible controls.

- [ ] **Step 1: Add failing route-client contract tests**

```js
test("password and passphrase clients use shared local-only primitives", () => {
  for (const path of [
    "src/app/utilities/password-generator/PasswordGeneratorClient.tsx",
    "src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /UtilityPageLayout/);
    assert.match(source, /UtilityWorkbench/);
    assert.match(source, /useUtilityClipboard/);
    assert.match(source, /secureRandomInt/);
    assert.doesNotMatch(source, /console\.|fetch\(|localStorage|sessionStorage|Math\.random/);
  }
});
```

- [ ] **Step 2: Run the route-client test and verify it fails**

Run: `node --test tests/utility-pages-contract.test.mjs`

Expected: FAIL because the old clients log clipboard failures and do not use the shared system.

- [ ] **Step 3: Rebuild `PasswordGeneratorClient`**

Use this state and generation contract:

```tsx
const [length, setLength] = useState(14);
const [options, setOptions] = useState<CharacterOptions>({ uppercase: true, lowercase: true, numbers: true, special: true });
const [optionHint, setOptionHint] = useState("");
const [generation, setGeneration] = useState(0);
const password = useMemo(() => {
  void generation;
  return buildPassword(length, options, secureRandomInt);
}, [length, options, generation]);
const strength = getGeneratorStrength(length, Object.values(options).filter(Boolean).length);
const clipboard = useUtilityClipboard(password);

function changeOption(key: CharacterOption) {
  const result = toggleCharacterOption(options, key);
  setOptions(result.options);
  setOptionHint(result.blocked ? "Keep at least one character type enabled." : "");
}
```

Render `UtilityPageLayout` with a password workbench containing `UtilityOutput`, a 5–128 `UtilityRange`, four `UtilitySwitch` rows, a visible strength label/meter, and the option hint in `aria-live="polite"`. Supply three benefits, two educational sections, related tools, and CTA copy from the approved specification. Regeneration increments a numeric `generation` state; settings changes automatically recompute the value.

- [ ] **Step 4: Rebuild `PassphraseGeneratorClient`**

Use this state and formatting contract:

```tsx
const [wordCount, setWordCount] = useState(4);
const [separator, setSeparator] = useState<"-" | " " | "." | "," | "">("-");
const [capitalize, setCapitalize] = useState(false);
const [includeNumber, setIncludeNumber] = useState(false);
const [generation, setGeneration] = useState(0);
const ALL_WORDS = [...adjectives, ...colors, ...animals, ...names];
const selectedWords = useMemo(
  () => {
    void generation;
    return Array.from({ length: wordCount }, () => secureRandomItem(ALL_WORDS));
  },
  [wordCount, generation],
);
const passphrase = useMemo(
  () => formatPassphrase(selectedWords, separator, capitalize, includeNumber, secureRandomInt),
  [selectedWords, separator, capitalize, includeNumber],
);
```

Render `UtilityPageLayout` with `UtilityOutput`, a 3–20 word-count range, a five-option separator segment, capitalization and number switches, three route-specific benefits, two educational sections, related tools, and CTA. The value must wrap safely at 20 words.

- [ ] **Step 5: Run logic and route-client tests**

Run: `node --test tests/utility-generator-logic.test.mjs tests/utility-pages-contract.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Run lint on the two clients and shared utility files**

Run: `npx eslint src/app/utilities/password-generator/PasswordGeneratorClient.tsx src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx src/app/utilities/*.ts src/app/utilities/*.tsx`

Expected: exit 0 with no errors.

- [ ] **Step 7: Commit both generator routes**

```bash
git add src/app/utilities/password-generator/PasswordGeneratorClient.tsx src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx tests/utility-pages-contract.test.mjs
git commit -m "feat: redesign password and passphrase utilities"
```

---

### Task 5: Rebuild username generator and password strength tester

**Files:**

- Modify: `src/app/utilities/username-generator/UsernameGeneratorClient.tsx`
- Modify: `src/app/utilities/password-strength/PasswordStrengthClient.tsx`
- Modify: `tests/utility-pages-contract.test.mjs`

**Interfaces:**

- Consumes: shared generator rules and component system; `unique-names-generator` dictionaries; `zxcvbn` result types.
- Produces: two-mode username generation and stable, private strength analysis.

- [ ] **Step 1: Add failing privacy and mode contract tests**

```js
test("username and strength clients preserve mode, privacy, and local analysis contracts", () => {
  const username = read("src/app/utilities/username-generator/UsernameGeneratorClient.tsx");
  const strength = read("src/app/utilities/password-strength/PasswordStrengthClient.tsx");
  assert.match(username, /"words"\s*\|\s*"string"/);
  assert.match(username, /UtilitySegments/);
  assert.match(username, /useUtilityClipboard/);
  assert.match(strength, /zxcvbn\(password\)/);
  assert.match(strength, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(strength, /aria-live="polite"/);
  assert.doesNotMatch(`${username}\n${strength}`, /console\.|fetch\(|localStorage|sessionStorage|Math\.random/);
});
```

- [ ] **Step 2: Run the privacy and mode test and verify it fails**

Run: `node --test tests/utility-pages-contract.test.mjs`

Expected: FAIL because the old clients do not use the new mode names/shared system and still log clipboard errors.

- [ ] **Step 3: Rebuild `UsernameGeneratorClient`**

Use this exact state model:

```tsx
const [mode, setMode] = useState<"words" | "string">("words");
const [wordCount, setWordCount] = useState(2);
const [wordSeparator, setWordSeparator] = useState<"" | "-" | "." | "_">("");
const [capitalize, setCapitalize] = useState(false);
const [includeNumber, setIncludeNumber] = useState(true);
const [length, setLength] = useState(12);
const [options, setOptions] = useState<CharacterOptions>({ uppercase: true, lowercase: true, numbers: true, special: false });
```

Readable mode selects `wordCount` values securely from the existing dictionaries and passes them through `formatWordUsername`; random-string mode calls `buildRandomString`. Render only relevant controls for the selected mode, preserve both modes' state when switching, enforce at least one character set, and use `UtilityOutput`/`useUtilityClipboard` for consistent regenerate and copy feedback. Supply route-specific benefits, education, related tools, and CTA.

- [ ] **Step 4: Rebuild `PasswordStrengthClient`**

Use `zxcvbn(password)` inside `useMemo`, keep the input masked by default, and map scores with these exact labels and CSS data values:

```ts
const SCORE_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;
const result = useMemo(() => password ? zxcvbn(password) : null, [password]);
const scoreLabel = result ? SCORE_LABELS[result.score] : "Waiting for a password";
```

The workbench must contain a 16px+ labeled password input, show/hide button, four-segment meter using `data-score`, crack time, localized guess count, warning, and suggestions. Keep an empty-state panel of identical outer dimensions so results do not shift surrounding content. Add a polite live region that announces only the score label, not the password. Supply route-specific benefits, education, related tools, and CTA.

- [ ] **Step 5: Run all utility tests**

Run: `node --test tests/utility-generator-logic.test.mjs tests/utility-pages-contract.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Run lint on all four clients**

Run: `npx eslint src/app/utilities/username-generator/UsernameGeneratorClient.tsx src/app/utilities/password-strength/PasswordStrengthClient.tsx src/app/utilities/password-generator/PasswordGeneratorClient.tsx src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx`

Expected: exit 0 with no errors.

- [ ] **Step 7: Commit username and strength routes**

```bash
git add src/app/utilities/username-generator/UsernameGeneratorClient.tsx src/app/utilities/password-strength/PasswordStrengthClient.tsx tests/utility-pages-contract.test.mjs
git commit -m "feat: redesign username and strength utilities"
```

---

### Task 6: Validate Server Component boundaries, metadata, and all routes

**Files:**

- Modify: `tests/utility-pages-contract.test.mjs`

**Interfaces:**

- Consumes: all prior tasks.
- Produces: verified Server Component pages, stable SEO metadata, successful production build, and visually validated routes.

- [ ] **Step 1: Add route-boundary and metadata contract tests**

```js
test("utility pages stay server-rendered metadata boundaries", () => {
  for (const route of ["password-generator", "passphrase-generator", "username-generator", "password-strength"]) {
    const source = read(`src/app/utilities/${route}/page.tsx`);
    assert.doesNotMatch(source, /^"use client"/);
    assert.match(source, /export const metadata: Metadata = pageMetadata/);
    assert.match(source, /<PublicPageShell>/);
    assert.match(source, new RegExp(`path: ["']/utilities/${route}["']`));
  }
});

test("utility clients contain no network or persistence path for secrets", () => {
  const routes = ["password-generator", "passphrase-generator", "username-generator", "password-strength"];
  const sources = routes.map((route) => read(`src/app/utilities/${route}/${route.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("")}Client.tsx`)).join("\n");
  assert.doesNotMatch(sources, /fetch\(|axios|server action|localStorage|sessionStorage|document\.cookie|URLSearchParams|console\./i);
});
```

If the computed client filename makes the test less readable, replace it with an explicit path array before committing.

- [ ] **Step 2: Run the complete Node test suite**

Run: `npm test`

Expected: all repository tests pass with zero failures.

- [ ] **Step 3: Run repository lint**

Run: `npm run lint`

Expected: exit 0 with no ESLint errors.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: Next.js 16.2.10 build exits 0 and lists all four utility routes without prerender, hydration, or TypeScript errors.

- [ ] **Step 5: Start the production server for visual verification**

Run: `npm run start`

Expected: server listens locally without runtime errors. Keep the session running for the next steps.

- [ ] **Step 6: Inspect all routes at desktop width**

At 1440×1000, open each route and verify: navigation alignment; visible heading and complete workbench without clipping; immediate generate/test interaction; benefit, education, related-tool, CTA, and footer order; no artificial blank regions; no console errors.

- [ ] **Step 7: Inspect all routes at tablet and mobile widths**

At 834×1112 and 390×844, verify: single-column mobile order; 44px controls; no horizontal overflow; wrapped 128-character password and 20-word passphrase; username mode switching; masked strength input; stable result panel; browser zoom remains enabled.

- [ ] **Step 8: Complete accessibility and theme checks**

Using keyboard only, traverse every control and link with visible focus. Verify polite copy and score announcements, no focus movement after regeneration, light/dark contrast, reduced-motion behavior, and 200% browser zoom reflow.

- [ ] **Step 9: Review browser console and privacy behavior**

Confirm all four routes have no hydration/runtime errors. In the Network panel, generate/copy/test values and verify no request contains generated or tested data. Clear the password input and confirm no secret remains in the URL or persisted browser storage.

- [ ] **Step 10: Commit final route/test refinements**

```bash
git add src/app/utilities tests/utility-pages-contract.test.mjs
git commit -m "test: verify redesigned utility pages"
```

---

## Final acceptance checklist

- [ ] All four routes share the secure-workbench hierarchy and Velora visual identity.
- [ ] Password output includes every enabled character set and uses secure randomness.
- [ ] Passphrase and username modes honor every visible control.
- [ ] Strength testing remains local, masked by default, and stable while results change.
- [ ] Copy failures select the value and provide manual-copy guidance without logging it.
- [ ] Related tools exclude the active route and use internal Next.js links.
- [ ] No fixed hero height, clipped card, large blank section, or horizontal overflow remains.
- [ ] Light, dark, reduced-motion, keyboard, 200% zoom, mobile, tablet, and desktop checks pass.
- [ ] `npm test`, `npm run lint`, and `npm run build` all exit successfully.
- [ ] Browser console and Network checks show no runtime errors or secret-bearing requests.
