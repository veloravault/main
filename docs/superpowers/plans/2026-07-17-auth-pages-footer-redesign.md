# Auth Pages and Footer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/login` and `/signup` dedicated, collision-free account chrome and replace the public frosted-card footer with a responsive graphite “vault threshold” footer using authentic payment assets.

**Architecture:** Add a focused client-side `AccountFrame` that owns only the brand, appearance control, safe-area layout, and account-page background. Extend `AuthShell` with an `embedded` presentation flag so the same authentication UI can live inside that frame without claiming a second viewport; standalone confirmation/reset/onboarding screens retain current behavior. Rebuild `Footer` around identity, navigation, and trust bands while keeping `PaymentBadges` as the single owner of real payment-network images.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Framer Motion, Lucide React, Node test runner, ESLint.

## Global Constraints

- Preserve all Supabase authentication calls, redirects, search-parameter handling, form validation, security copy, and live-region behavior.
- Login and signup must not render `PublicPageShell`, marketing navigation, the authentication popup, or the public footer.
- Account header must stay in document flow; do not use fixed positioning, negative margins, or guessed navigation-clearance variables.
- Mobile account controls must expose at least 44 px targets, inputs must remain at least 16 px, and safe-area insets must be respected.
- Footer palette is graphite `#0b0b0d`, raised graphite `#151518`, primary `#f5f5f7`, muted `#a1a1a6`, blue `#2997ff`, and trust green `#30d158`.
- Footer promise is exactly “Encrypted before storage. Yours to unlock.”
- Visa, Mastercard, RuPay, and UPI remain local image assets rendered with `next/image`; never redraw or generate payment-network logos.
- Preserve reduced-motion behavior and the existing `ThemeProvider` contract.
- Preserve the unrelated `.claude/settings.json` working-tree change.

---

### Task 1: Dedicated Account Frame and Embedded Auth Layout

**Files:**
- Create: `src/components/auth/AccountFrame.tsx`
- Create: `src/components/auth/account-frame.module.css`
- Modify: `src/components/auth/AuthShell.tsx`
- Modify: `src/components/auth/auth-shell.module.css`
- Modify: `src/components/auth/AuthGateway.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/signup/page.tsx`
- Test: `tests/auth-ui-restoration.test.mjs`

**Interfaces:**
- Produces: `AccountFrame({ children }: { children: ReactNode }): JSX.Element`, an in-flow account-only page wrapper.
- Produces: `AuthShellProps.embedded?: boolean`; when true, the component renders its stage inside a non-viewport `.embeddedPage` container.
- Consumes: `useTheme()`, `VeloraBrandMark`, and unchanged `AuthGateway` authentication behavior.

- [ ] **Step 1: Write failing account-frame regression assertions**

Update `tests/auth-ui-restoration.test.mjs` so the public-authentication test reads both account routes and the new frame, then asserts:

```js
const login = read("src/app/login/page.tsx");
const signup = read("src/app/signup/page.tsx");
const accountFramePath = "src/components/auth/AccountFrame.tsx";
const accountCssPath = "src/components/auth/account-frame.module.css";

assert.equal(existsSync(new URL(`../${accountFramePath}`, import.meta.url)), true);
assert.equal(existsSync(new URL(`../${accountCssPath}`, import.meta.url)), true);

const accountFrame = read(accountFramePath);
const accountCss = read(accountCssPath);

for (const route of [login, signup]) {
  assert.match(route, /import \{ AccountFrame \}/);
  assert.match(route, /<AccountFrame>/);
  assert.doesNotMatch(route, /PublicPageShell/);
}

assert.doesNotMatch(accountFrame, /Footer|NAV_LINKS|PublicPageShell|burger/i);
assert.match(accountFrame, /Velora Vault home/);
assert.match(accountFrame, /Toggle appearance/);
assert.doesNotMatch(accountCss, /position:\s*fixed/);
assert.match(accountCss, /safe-area-inset-top/);
assert.match(accountCss, /safe-area-inset-bottom/);
assert.match(accountCss, /min-(?:width|height):\s*44px/);
assert.match(css, /embeddedPage/);
assert.doesNotMatch(css, /--public-nav-clearance|--auth-top-space/);
```

Also update the public-page route list in `tests/landing-trust.test.mjs` to exclude only `src/app/login/page.tsx` and `src/app/signup/page.tsx`; confirmation, reset, and onboarding continue using `PublicPageShell`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --test tests/auth-ui-restoration.test.mjs tests/landing-trust.test.mjs
```

Expected: FAIL because `AccountFrame.tsx` and `account-frame.module.css` do not exist and login/signup still import `PublicPageShell`.

- [ ] **Step 3: Implement the account frame and embedded shell mode**

Create `AccountFrame.tsx` as a client component using `useTheme`, `useReducedMotion`, `MoonIcon`, `SunIcon`, `VeloraBrandMark`, and its CSS module. Its semantic structure is:

```tsx
export function AccountFrame({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={styles.frame}>
      <motion.header className={styles.header} initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <a href="/" className={styles.brand} aria-label="Velora Vault home">
          <VeloraBrandMark className={styles.mark} />
          <span>Velora Vault</span>
        </a>
        <button
          type="button"
          className={styles.themeToggle}
          aria-label="Toggle appearance"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
        </button>
      </motion.header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
```

Implement the frame with a two-row grid (`auto minmax(0, 1fr)`), `min-height: 100dvh`, in-flow header, safe-area padding, a 44 px appearance target, and vertically centered content that switches to start alignment on short/mobile viewports.

Add `embedded?: boolean` to `AuthShellProps`; return `<main className={embedded ? styles.embeddedPage : styles.page}>`. Keep the current `.page` viewport behavior for standalone flows, add `.embeddedPage` without `100dvh`, and remove the public-navigation clearance variables from `.page`. Pass `embedded` from `AuthGateway` because only login/signup render the gateway.

Replace `PublicPageShell` with `AccountFrame` in both route pages without changing route metadata, search parameters, notices, or `AuthGateway` props.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/auth-ui-restoration.test.mjs tests/landing-trust.test.mjs
```

Expected: PASS with no failed assertions.

- [ ] **Step 5: Commit the account-page change**

```bash
git add src/components/auth/AccountFrame.tsx src/components/auth/account-frame.module.css src/components/auth/AuthShell.tsx src/components/auth/auth-shell.module.css src/components/auth/AuthGateway.tsx src/app/login/page.tsx src/app/signup/page.tsx tests/auth-ui-restoration.test.mjs tests/landing-trust.test.mjs
git commit -m "fix: give auth pages dedicated account chrome"
```

---

### Task 2: Graphite Vault-Threshold Footer

**Files:**
- Modify: `src/components/dreelio/Footer.tsx`
- Modify: `src/components/dreelio/Footer.module.css`
- Modify: `src/components/dreelio/PaymentBadges.module.css`
- Test: `tests/landing-trust.test.mjs`
- Test: `tests/dreelio-logo-assets.test.mjs`

**Interfaces:**
- Consumes: unchanged `FOOTER_COLUMNS`, `PaymentBadges({ className?: string })`, `VeloraBrandMark`, and Framer Motion helpers.
- Produces: semantic `.footer`, `.primary`, `.identity`, `.linkCols`, `.trustRail`, and `.legal` regions; removes the former `.card` and `.divider` structure.

- [ ] **Step 1: Write failing footer structure and styling assertions**

Add a focused test in `tests/landing-trust.test.mjs`:

```js
test("public footer closes the page with identity, navigation, and payment trust", () => {
  const footer = read("src/components/dreelio/Footer.tsx");
  const css = read("src/components/dreelio/Footer.module.css");

  assert.match(footer, /Encrypted before storage\. Yours to unlock\./);
  assert.match(footer, /aria-label=\{col\.heading\}/);
  assert.match(footer, /<PaymentBadges/);
  assert.match(footer, /Payments secured by Razorpay/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/terms"/);
  assert.doesNotMatch(footer, /styles\.card|styles\.divider/);
  assert.match(css, /#0b0b0d/i);
  assert.match(css, /#f5f5f7/i);
  assert.match(css, /#a1a1a6/i);
  assert.match(css, /#2997ff/i);
  assert.match(css, /#30d158/i);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
```

Extend `tests/dreelio-logo-assets.test.mjs` to assert that payment badges keep a wrapping `.marks` group and use white logo tiles suitable for the graphite background.

- [ ] **Step 2: Run footer tests and verify RED**

Run:

```bash
node --test tests/landing-trust.test.mjs tests/dreelio-logo-assets.test.mjs
```

Expected: FAIL because the new promise, semantic link labels, legal links, graphite palette, and responsive breakpoints are absent.

- [ ] **Step 3: Rebuild the footer markup and CSS**

Replace the footer’s inner card with:

```tsx
<div className={styles.inner}>
  <div className={styles.primary}>
    <motion.div className={styles.identity} variants={staggerItem}>
      <a href="/" className={styles.brand} aria-label="Velora Vault home">...</a>
      <p className={styles.promise}>Encrypted before storage.<br />Yours to unlock.</p>
      <p className={styles.desc}>A private home for passwords, documents, notes, and financial essentials.</p>
    </motion.div>
    <motion.div className={styles.linkCols} variants={staggerContainer}>
      {FOOTER_COLUMNS.map((col) => (
        <motion.nav key={col.heading} aria-label={col.heading} className={styles.linkCol} variants={staggerItem}>...</motion.nav>
      ))}
    </motion.div>
  </div>
  <motion.div className={styles.trustRail} variants={staggerItem}>
    <PaymentBadges className={styles.paymentBadges} />
    <span className={styles.securedBy}><ShieldCheckIcon aria-hidden="true" /> Payments secured by Razorpay</span>
  </motion.div>
  <div className={styles.legal}>
    <p>© 2026 Velora Vault. All rights reserved.</p>
    <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
  </div>
</div>
```

Replace `Footer.module.css` with a full-width graphite footer using the exact palette in Global Constraints, a maximum-width inner grid, a large balanced promise, two compact semantic navigation columns, a raised trust rail, and mobile layouts at 720 px and 360 px. Ensure focus-visible styles, wrapping payment rows, no horizontal overflow, and reduced-motion overrides.

Adjust `PaymentBadges.module.css` so marks wrap, each authentic logo sits on an accessible white tile, separator/text colors work on graphite, and the 320 px layout cannot overflow.

- [ ] **Step 4: Run footer tests and verify GREEN**

Run:

```bash
node --test tests/landing-trust.test.mjs tests/dreelio-logo-assets.test.mjs
```

Expected: PASS with no failed assertions.

- [ ] **Step 5: Commit the footer redesign**

```bash
git add src/components/dreelio/Footer.tsx src/components/dreelio/Footer.module.css src/components/dreelio/PaymentBadges.module.css tests/landing-trust.test.mjs tests/dreelio-logo-assets.test.mjs
git commit -m "feat: redesign the public vault footer"
```

---

### Task 3: Full Verification and Visual Regression Pass

**Files:**
- Modify if required by observed defects: `src/components/auth/account-frame.module.css`
- Modify if required by observed defects: `src/components/auth/auth-shell.module.css`
- Modify if required by observed defects: `src/components/dreelio/Footer.module.css`
- Modify if required by observed defects: `src/components/dreelio/PaymentBadges.module.css`

**Interfaces:**
- Consumes: completed account-frame and footer implementations.
- Produces: browser-verified desktop/mobile layouts without overlap or horizontal overflow.

- [ ] **Step 1: Run static and production verification**

Run sequentially so failures remain attributable:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: every command exits 0; Node tests report zero failures, ESLint reports zero errors, TypeScript reports no diagnostics, and Next.js completes a production build.

- [ ] **Step 2: Start the production server for browser verification**

Run:

```bash
npm start
```

Expected: Next.js listens on `http://localhost:3000` without runtime errors.

- [ ] **Step 3: Verify account pages at desktop and mobile widths**

Open `/login` and `/signup` at 1440×900 and 390×844. For each route confirm:

```text
- Account header is visible and in flow.
- Heading top is below the header bottom by at least 32 px when height permits.
- Login and signup share the same form width.
- Signup content never enters the header region.
- No marketing links, hamburger, popup, or public footer is present.
- Theme toggle works and its target is at least 44×44 px.
- document.documentElement.scrollWidth <= document.documentElement.clientWidth.
```

- [ ] **Step 4: Verify the public footer at desktop and mobile widths**

Open `/` at 1440×900, 390×844, and 320×720; scroll to the footer and confirm:

```text
- Graphite footer spans the full page width and clearly closes the page.
- Identity/promise, two link groups, payment marks, Razorpay security copy, and legal row are visible.
- Visa, Mastercard, RuPay, and UPI render as authentic image assets.
- Payment tiles wrap without clipping or horizontal scrolling.
- Link focus states remain visible in light and dark themes.
- document.documentElement.scrollWidth <= document.documentElement.clientWidth.
```

- [ ] **Step 5: Fix only observed layout defects and repeat verification**

If a browser check fails, first add or tighten the corresponding static regression assertion where practical, confirm it fails, make the smallest CSS/markup correction, and rerun the focused test plus Steps 1, 3, and 4. Do not change authentication, billing, or onboarding behavior during this pass.

- [ ] **Step 6: Commit verified visual corrections if any**

```bash
git add src/components/auth/account-frame.module.css src/components/auth/auth-shell.module.css src/components/dreelio/Footer.module.css src/components/dreelio/PaymentBadges.module.css tests
git diff --cached --quiet || git commit -m "fix: polish responsive auth and footer layouts"
```

