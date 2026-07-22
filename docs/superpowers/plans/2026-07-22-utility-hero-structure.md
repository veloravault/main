# Utility Hero Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate each utility page's introductory hero from its interactive workbench so visitors see a spacious hero first and reach the generator by scrolling.

**Architecture:** Update the shared `UtilityPageLayout` once so all four routes receive the same hero, decorative placeholder, and standalone workbench section without changing any route client state. Extend the existing utility CSS module for the new structural classes and use source-contract tests to lock in section order, accessibility, responsive behavior, and the unchanged privacy boundary.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, CSS Modules, Framer Motion, Node test runner

## Global Constraints

- Apply the shared structure to `/utilities/password-generator`, `/utilities/passphrase-generator`, `/utilities/username-generator`, and `/utilities/password-strength`.
- The hero and workbench are separate sections; the workbench never appears beside hero copy.
- The right hero column is a decorative structural placeholder only, with no photos, generated artwork, fake controls, or route logic.
- Preserve existing utility logic, privacy behavior, navigation, footer, benefits, education, related tools, CTA, dark mode, and reduced-motion behavior.
- Use content-driven mobile height and a desktop `min-height`; never use a fixed hero height that can clip content.
- The placeholder is hidden from assistive technology, and the workbench anchor accounts for fixed navigation.
- Do not modify or stage the user's untracked screenshot and reference files.

---

### Task 1: Lock in and implement the shared section hierarchy

**Files:**
- Modify: `tests/utility-pages-contract.test.mjs`
- Modify: `src/app/utilities/UtilityPageLayout.tsx`

**Interfaces:**
- Consumes: the existing `UtilityPageLayout` props, including `title`, `description`, and `workbench: ReactNode`
- Produces: shared CSS hooks `heroVisual`, `heroVisualFrame`, `heroVisualInset`, `heroVisualResult`, and `workbenchSection`

- [ ] **Step 1: Read the installed Next.js guidance before editing**

Run:

```bash
sed -n '1,240p' node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
sed -n '1,240p' node_modules/next/dist/docs/01-app/01-getting-started/11-css.md
```

Expected: the installed Next.js 16.2 documentation confirms the existing Client Component and CSS Module patterns remain valid.

- [ ] **Step 2: Write the failing hierarchy contract test**

Add to `tests/utility-pages-contract.test.mjs`:

```js
test("utility hero precedes a separate workbench section", () => {
  const source = read("src/app/utilities/UtilityPageLayout.tsx");
  const heroStart = source.indexOf("className={styles.hero}");
  const placeholder = source.indexOf("className={styles.heroVisual}");
  const workbenchSection = source.indexOf("className={styles.workbenchSection}");
  const workbench = source.indexOf("{props.workbench}");

  assert.ok(heroStart >= 0, "shared hero exists");
  assert.ok(placeholder > heroStart, "placeholder belongs to the hero");
  assert.ok(workbenchSection > placeholder, "workbench section follows the hero");
  assert.ok(workbench > workbenchSection, "workbench renders inside its own section");
  assert.match(source, /className=\{styles\.heroVisual\}[\s\S]*aria-hidden="true"/);
  assert.equal(source.match(/\{props\.workbench\}/g)?.length, 1);
});
```

- [ ] **Step 3: Run the focused contract test and verify it fails**

Run:

```bash
node --test --test-name-pattern="utility hero precedes" tests/utility-pages-contract.test.mjs
```

Expected: FAIL because `heroVisual` and `workbenchSection` do not exist and the workbench is still inside the hero.

- [ ] **Step 4: Restructure the shared layout**

In `src/app/utilities/UtilityPageLayout.tsx`, replace the current `heroWorkbench` node inside the hero with the decorative placeholder, then render the workbench after the closing hero section:

```tsx
<motion.div
  className={styles.heroVisual}
  variants={staggerItem}
  aria-hidden="true"
>
  <div className={styles.heroVisualFrame}>
    <div className={styles.heroVisualInset} />
    <div className={styles.heroVisualResult}>
      <span />
      <span />
      <span />
    </div>
  </div>
</motion.div>
```

Immediately after `</motion.section>`, add:

```tsx
<section className={styles.workbenchSection}>
  {props.workbench}
</section>
```

Keep the existing anchor target `#utility-workbench-title`, hero motion variants, and all content after the workbench unchanged.

- [ ] **Step 5: Run the focused and full contract suites**

Run:

```bash
node --test --test-name-pattern="utility hero precedes" tests/utility-pages-contract.test.mjs
node --test tests/utility-pages-contract.test.mjs
```

Expected: the focused test passes; the complete utility contract file passes with no privacy or behavior regressions.

- [ ] **Step 6: Commit the hierarchy change**

```bash
git add tests/utility-pages-contract.test.mjs src/app/utilities/UtilityPageLayout.tsx
git commit -m "feat: separate utility heroes from workbenches"
```

---

### Task 2: Build the responsive hero and placeholder structure

**Files:**
- Modify: `tests/utility-pages-contract.test.mjs`
- Modify: `src/app/utilities/utilities.module.css`

**Interfaces:**
- Consumes: `heroVisual`, `heroVisualFrame`, `heroVisualInset`, `heroVisualResult`, and `workbenchSection` emitted by `UtilityPageLayout`
- Produces: desktop two-column hero, stacked mobile hero, decorative placeholder, anchor clearance, and spacing between the workbench and benefit grid

- [ ] **Step 1: Add failing CSS structure assertions**

Extend `utility styles define responsive, focus, overflow, and reduced-motion safeguards` in `tests/utility-pages-contract.test.mjs`:

```js
  assert.match(css, /\.hero\s*\{[^}]*min-height:\s*min\(/);
  assert.match(css, /\.heroVisual\b/);
  assert.match(css, /\.heroVisualFrame\b/);
  assert.match(css, /\.heroVisualInset\b/);
  assert.match(css, /\.heroVisualResult\b/);
  assert.match(css, /\.workbenchSection\s*\{[^}]*scroll-margin-top:/);
  assert.match(
    css,
    /@media \(max-width: 767px\)[\s\S]*?\.hero\s*\{[^}]*min-height:\s*auto/,
  );
```

- [ ] **Step 2: Run the focused style test and verify it fails**

Run:

```bash
node --test --test-name-pattern="utility styles define" tests/utility-pages-contract.test.mjs
```

Expected: FAIL because the new hero, placeholder, and workbench-section declarations do not exist.

- [ ] **Step 3: Replace the opening layout CSS**

In `src/app/utilities/utilities.module.css`:

```css
.hero {
  display: grid;
  min-height: min(760px, calc(100svh - 150px));
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
  gap: clamp(48px, 8vw, 112px);
  align-items: center;
  padding: 48px 0 96px;
}

.heroCopy,
.heroVisual,
.workbenchHeader > div,
.workbenchBody > *,
.educationCopy,
.educationAside,
.relatedCard > span,
.finalCard > div {
  min-width: 0;
}

.heroVisual {
  position: relative;
  width: 100%;
  min-height: clamp(360px, 42vw, 520px);
}

.heroVisualFrame {
  position: absolute;
  inset: 8% 0 4% 8%;
  border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--line));
  border-radius: 34px;
  background: color-mix(in srgb, var(--accent) 6%, var(--surface-alt-soft));
  box-shadow: 0 32px 80px -56px rgba(0, 0, 0, 0.55);
}

.heroVisualInset {
  position: absolute;
  inset: 38px 38px 72px;
  border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--line));
  border-radius: 24px;
  background: var(--card-white);
}

.heroVisualResult {
  position: absolute;
  right: 8%;
  bottom: 8%;
  left: -10%;
  display: flex;
  min-height: 76px;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--card-white);
  box-shadow: 0 24px 56px -38px rgba(0, 0, 0, 0.55);
}

.heroVisualResult span {
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 22%, var(--line));
}

.heroVisualResult span:nth-child(1) { width: 18%; }
.heroVisualResult span:nth-child(2) { width: 42%; }
.heroVisualResult span:nth-child(3) { width: 24%; }

.workbenchSection {
  scroll-margin-top: 124px;
  padding-bottom: 88px;
}
```

Remove `.heroWorkbench` from the shared width rule and replace the existing hero declarations inside the two responsive blocks with:

```css
@media (max-width: 960px) {
  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
    gap: 40px;
  }
}

@media (max-width: 767px) {
  .hero {
    min-height: auto;
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 24px 0 72px;
  }

  .heroVisual {
    min-height: 300px;
  }

  .heroVisualFrame {
    inset: 4% 0 4% 6%;
    border-radius: 26px;
  }

  .heroVisualInset {
    inset: 24px 24px 62px;
    border-radius: 18px;
  }

  .heroVisualResult {
    right: 6%;
    bottom: 7%;
    left: 0;
    min-height: 64px;
    padding: 16px 18px;
  }

  .workbenchSection {
    padding-bottom: 64px;
  }
}
```

- [ ] **Step 4: Run focused tests and lint**

Run:

```bash
node --test tests/utility-pages-contract.test.mjs
npm run lint
```

Expected: utility contracts pass and ESLint exits 0.

- [ ] **Step 5: Run the production build**

Run:

```bash
npm run build
```

Expected: Next.js exits 0 and lists all four utility routes.

- [ ] **Step 6: Verify the rendered structure**

Start the production app and inspect:

- Desktop `1440×1000`: all four routes show hero copy plus placeholder before a separate workbench.
- Tablet `834×1112`: one representative route keeps a balanced hero and separate workbench.
- Mobile `390×844`: all four routes stack copy, placeholder, then workbench with no horizontal overflow.
- The hero action lands with `utility-workbench-title` visible below the fixed navigation.
- Light and dark themes keep the placeholder legible.
- Keyboard focus remains visible and reduced motion introduces no delayed content.
- Generator and strength interactions behave exactly as before.

Expected: the structural scroll journey matches the approved specification and browser console has no utility-page errors.

- [ ] **Step 7: Run final verification and commit**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: 0 test failures, ESLint exit 0, build exit 0, and no whitespace errors.

Then commit:

```bash
git add tests/utility-pages-contract.test.mjs src/app/utilities/utilities.module.css
git commit -m "feat: add scroll-first utility hero structure"
```
