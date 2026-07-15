# Apple Ecosystem Wallet UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct wallet-card network logos and apply a coherent iOS Wallet-led Apple ecosystem interface across Velora Vault without changing its data or security behavior.

**Architecture:** Introduce a focused `PaymentCard` presentation component and a shared network-logo resolver, then centralize Apple-like materials and layout primitives in `globals.css`. Existing vault components keep ownership of Supabase calls, encryption, and state; they only adopt shared presentation classes and the extracted wallet renderer.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, Framer Motion 12, Lucide React, Supabase, Node test runner.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before framework-specific code changes.
- Preserve Supabase tables, RLS behavior, encryption formats, PIN/biometric protocols, Groq, and Gemini integrations.
- Use Apple-compatible system fonts; add no font or icon dependency.
- Mobile is led by iOS Wallet; desktop adapts the same system to macOS productivity patterns.
- Respect `prefers-reduced-motion`, visible keyboard focus, safe areas, and 44px mobile touch targets.
- Do not stage or modify the pre-existing untracked `public/visa_transparent.svg` unless it is deliberately selected as the canonical fixed asset during Task 1.

---

## File Structure

- `src/components/CardLogos.tsx`: network detection and intrinsically proportioned Visa, RuPay, and Mastercard marks.
- `src/components/PaymentCard.tsx`: presentation-only Apple Wallet card; consumes decrypted display data and emits select/expand actions.
- `src/components/WalletVault.tsx`: retains card CRUD, encryption, scanning, filtering, selection, and dialog state; delegates card presentation.
- `src/app/globals.css`: application tokens, materials, grouped surfaces, safe areas, focus, and reduced-motion rules.
- `src/app/page.tsx`: responsive application shell, mobile large title, desktop toolbar/sidebar, and bottom navigation.
- `src/components/{Auth,PinLock,Dashboard,PasswordVault,DocumentVault,NotesVault,BankVault,Profile,GlobalMagicImport,GlobalSearch,Toast,Skeleton,EmptyState}.tsx`: adopt shared Apple surface/control classes without changing data flow.
- `tests/project-integrity.test.mjs`: structural regression checks for logo source of truth, Apple shell primitives, accessibility rules, and preservation of secure data paths.

---

### Task 1: Canonical Payment Network Logos

**Files:**
- Modify: `tests/project-integrity.test.mjs`
- Modify: `src/components/CardLogos.tsx`
- Inspect/select: `public/visa.svg`, `public/visa_transparent.svg`, `public/rupay.svg`

**Interfaces:**
- Produces: `type CardNetwork = "visa" | "mastercard" | "rupay" | "generic"`
- Produces: `getCardNetwork(label: string): CardNetwork`
- Produces: `CardNetworkLogo({ network, className }: { network: CardNetwork; className?: string }): React.ReactNode`

- [ ] **Step 1: Add failing network-logo integrity checks**

Add a test that asserts the shared component exports `getCardNetwork` and `CardNetworkLogo`, maps Visa and RuPay labels case-insensitively, includes a native Mastercard mark, uses `object-contain`, and references only transparent/canonical assets. Also assert `WalletVault.tsx` no longer imports separate `VisaLogo` and `RuPayLogo` symbols.

```js
test("payment cards use one proportional network-logo source of truth", () => {
  const logos = read("src/components/CardLogos.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  assert.match(logos, /export type CardNetwork/);
  assert.match(logos, /export function getCardNetwork/);
  assert.match(logos, /export function CardNetworkLogo/);
  assert.match(logos, /object-contain/);
  assert.match(logos, /mastercard/i);
  assert.equal(wallet.includes("VisaLogo, RuPayLogo"), false);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --test --test-name-pattern="payment cards use one proportional" tests/project-integrity.test.mjs`

Expected: FAIL because the exports and unified renderer do not exist.

- [ ] **Step 3: Implement the network resolver and renderer**

Use normalized lowercase label matching. Render Visa and RuPay inside brand-specific optical boxes with `h-full w-full object-contain`; render Mastercard from two overlapping circles so it never depends on a raster asset. Keep a text fallback for unknown networks and accessible `aria-label` text.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `node --test --test-name-pattern="payment cards use one proportional" tests/project-integrity.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the logo source of truth**

```bash
git add tests/project-integrity.test.mjs src/components/CardLogos.tsx public/visa_transparent.svg
git commit -m "fix: normalize wallet card network logos"
```

Only add `public/visa_transparent.svg` if inspection proves it is the selected canonical Visa artwork; otherwise omit it from `git add`.

---

### Task 2: Apple Visual Tokens and Shared Primitives

**Files:**
- Modify: `tests/project-integrity.test.mjs`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces CSS classes: `.apple-app`, `.apple-material`, `.apple-group`, `.apple-control`, `.apple-button-primary`, `.apple-large-title`, `.apple-toolbar`, `.apple-sheet`, `.apple-tabbar`
- Produces CSS variables: `--system-blue`, `--grouped-bg`, `--elevated-bg`, `--separator`, `--apple-shadow`

- [ ] **Step 1: Add failing visual-system checks**

```js
test("Apple visual primitives include safe areas, focus, and reduced motion", () => {
  const css = read("src/app/globals.css");
  for (const token of ["--system-blue", "--grouped-bg", "--elevated-bg", "--separator", "--apple-shadow"]) {
    assert.match(css, new RegExp(token));
  }
  for (const klass of ["apple-material", "apple-group", "apple-control", "apple-sheet", "apple-tabbar"]) {
    assert.match(css, new RegExp(`\\.${klass}`));
  }
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*44px/);
});
```

- [ ] **Step 2: Run the new test and verify RED**

Run: `node --test --test-name-pattern="Apple visual primitives" tests/project-integrity.test.mjs`

Expected: FAIL on the missing tokens/classes.

- [ ] **Step 3: Implement light/dark tokens and primitives**

Set light tokens to system blue `#007aff`, grouped gray `#f2f2f7`, elevated white `#ffffff`, graphite `#1c1c1e`; set dark tokens to black grouped background and `#1c1c1e` surfaces. Define system font stacks, hairline separators, restrained blur/shadow, 44px mobile controls, safe areas, visible focus rings, and a reduced-motion block that collapses animation and transition duration.

- [ ] **Step 4: Run targeted and existing integrity tests**

Run: `node --test tests/project-integrity.test.mjs`

Expected: new test passes. Update the stale test that requires `ios-mobile-tabbar` to require `apple-tabbar`; do not weaken its safe-area and viewport assertions.

- [ ] **Step 5: Commit the shared visual system**

```bash
git add tests/project-integrity.test.mjs src/app/globals.css
git commit -m "feat: add Apple ecosystem visual primitives"
```

---

### Task 3: iOS Wallet Payment Card Component

**Files:**
- Create: `src/components/PaymentCard.tsx`
- Modify: `src/components/WalletVault.tsx`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Consumes: `CardNetworkLogo` and `getCardNetwork` from `CardLogos.tsx`
- Produces: `PaymentCardProps` with `item`, `selected`, `selectionMode`, `expanded`, `stackIndex`, `onSelect`, and `onToggle`
- Produces: `PaymentCard(props: PaymentCardProps): React.ReactNode`

- [ ] **Step 1: Add a failing component-boundary test**

```js
test("wallet presentation is isolated in an accessible PaymentCard", () => {
  const card = read("src/components/PaymentCard.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  assert.match(card, /export interface PaymentCardProps/);
  assert.match(card, /export function PaymentCard/);
  assert.match(card, /CardNetworkLogo/);
  assert.match(card, /aria-expanded/);
  assert.match(card, /tabular-nums/);
  assert.match(wallet, /<PaymentCard/);
});
```

- [ ] **Step 2: Run it and verify RED**

Run: `node --test --test-name-pattern="wallet presentation is isolated" tests/project-integrity.test.mjs`

Expected: FAIL because `PaymentCard.tsx` does not exist.

- [ ] **Step 3: Implement the presentation component**

Move gradient selection, network detection, logo placement, masked number, cardholder, expiry, subtype label, selection checkmark, and expand action into `PaymentCard`. Use an aspect ratio near `1.586 / 1`, top-right optical logo box, `tabular-nums`, semantic button behavior, Framer Motion spring entry, and reduced-motion-compatible CSS.

- [ ] **Step 4: Replace the inline `CardGrid` card markup**

Keep `WalletVault` CRUD and decrypted payload types unchanged. Map each item to `PaymentCard`, pass selection and expanded state, and preserve the existing detail panel and delete actions.

- [ ] **Step 5: Verify component tests and build**

Run: `node --test tests/project-integrity.test.mjs && npm run build`

Expected: integrity tests PASS and Next.js production build exits 0.

- [ ] **Step 6: Commit the wallet card renderer**

```bash
git add tests/project-integrity.test.mjs src/components/PaymentCard.tsx src/components/WalletVault.tsx
git commit -m "feat: rebuild cards with iOS Wallet presentation"
```

---

### Task 4: Responsive Apple Application Shell

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Consumes: shared Apple CSS primitives from Task 2
- Preserves: `Tab`, navigation callbacks, search behavior, session/master-key flow, and `sharedProps`

- [ ] **Step 1: Add failing shell assertions**

Require `apple-app`, `apple-sidebar`, `apple-toolbar`, `apple-large-title`, and `apple-tabbar` in `page.tsx`. Assert the mobile bar has an accessible navigation label and that the content scroll container remains safe-area-aware.

- [ ] **Step 2: Run shell test and verify RED**

Run: `node --test --test-name-pattern="mobile shell" tests/project-integrity.test.mjs`

Expected: FAIL because the new shell classes are absent.

- [ ] **Step 3: Implement mobile shell**

Use the existing tab state and render an iOS large title, grouped content background, and translucent fixed bottom bar with five primary destinations. Keep Bank Accounts reachable from dashboard/sidebar/search and expose Profile via a top-right avatar action so no functionality disappears.

- [ ] **Step 4: Implement desktop shell**

Restyle the existing sidebar as macOS translucent navigation. Add a frosted toolbar for title, search, theme, and import. Keep the content maximum width and all current events unchanged.

- [ ] **Step 5: Verify shell integrity and build**

Run: `node --test tests/project-integrity.test.mjs && npm run build`

Expected: PASS and build exit 0.

- [ ] **Step 6: Commit the application shell**

```bash
git add tests/project-integrity.test.mjs src/app/page.tsx src/app/globals.css
git commit -m "feat: refresh responsive Apple application shell"
```

---

### Task 5: Core Vault Surfaces

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/PasswordVault.tsx`
- Modify: `src/components/DocumentVault.tsx`
- Modify: `src/components/NotesVault.tsx`
- Modify: `src/components/BankVault.tsx`
- Modify: `src/components/EmptyState.tsx`
- Modify: `src/components/Skeleton.tsx`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Consumes: `.apple-group`, `.apple-control`, `.apple-button-primary`, `.apple-sheet`
- Preserves: all existing component props, Supabase calls, encryption/decryption calls, cache keys, and focus-by-ID behavior

- [ ] **Step 1: Add failing adoption checks**

Add a test that iterates over the seven surface files and requires at least one shared `apple-group`, `apple-control`, or `apple-sheet` primitive in each relevant interactive surface. Separately require dashboard health, empty-state CTA, and skeleton classes to remain present.

- [ ] **Step 2: Run and verify RED**

Run: `node --test --test-name-pattern="vault surfaces share Apple" tests/project-integrity.test.mjs`

Expected: FAIL on files that have not adopted the primitives.

- [ ] **Step 3: Restyle dashboard and passive states**

Make vault health the dashboard’s primary status, group recent items, and replace generic metric-card treatment. Apply the same radii/materials to empty states and skeletons without changing their content APIs.

- [ ] **Step 4: Restyle passwords, documents, and notes**

Convert list containers to grouped Apple surfaces, inputs to `apple-control`, primary actions to `apple-button-primary`, and add/edit panels to `apple-sheet`. Preserve current CRUD, import, focus, selection, and encryption paths exactly.

- [ ] **Step 5: Restyle bank accounts**

Use grouped institution rows rather than payment-card gradients. Preserve bank scanning, encrypted payload fields, selection, and deletion behavior.

- [ ] **Step 6: Verify integrity and build**

Run: `node --test tests/project-integrity.test.mjs && npm run build`

Expected: PASS and build exit 0.

- [ ] **Step 7: Commit core surfaces**

```bash
git add tests/project-integrity.test.mjs src/components/Dashboard.tsx src/components/PasswordVault.tsx src/components/DocumentVault.tsx src/components/NotesVault.tsx src/components/BankVault.tsx src/components/EmptyState.tsx src/components/Skeleton.tsx
git commit -m "feat: apply Apple grouped styling to vault surfaces"
```

---

### Task 6: Authentication, Profile, Search, Import, and Feedback

**Files:**
- Modify: `src/components/Auth.tsx`
- Modify: `src/components/PinLock.tsx`
- Modify: `src/components/Profile.tsx`
- Modify: `src/components/GlobalSearch.tsx`
- Modify: `src/components/GlobalMagicImport.tsx`
- Modify: `src/components/Toast.tsx`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Consumes: shared Apple primitives
- Preserves: existing props, auth calls, biometric and PIN helpers, search callbacks, import handlers, and toast context API

- [ ] **Step 1: Add failing coverage checks**

Require Apple primitives in all six components; require Auth to retain distinct account `password` and `masterPassword` state; require PinLock to retain the six-digit flow; require Profile destructive actions to remain visually separated through a destructive group class.

- [ ] **Step 2: Run and verify RED**

Run: `node --test --test-name-pattern="supporting surfaces share Apple" tests/project-integrity.test.mjs`

Expected: FAIL on missing classes.

- [ ] **Step 3: Restyle auth and unlock**

Apply a centered secure surface, native field sizing, explicit account-password/master-key labels, Apple keypad geometry, and restrained biometric affordance. Do not change storage or credential behavior.

- [ ] **Step 4: Restyle profile and overlays**

Use iOS Settings-like identity, security, appearance, data, and destructive groups in Profile. Use a Spotlight-like desktop search and sheet-like mobile search/import. Restyle toasts as compact translucent status capsules.

- [ ] **Step 5: Verify integrity and build**

Run: `node --test tests/project-integrity.test.mjs && npm run build`

Expected: PASS and build exit 0.

- [ ] **Step 6: Commit supporting surfaces**

```bash
git add tests/project-integrity.test.mjs src/components/Auth.tsx src/components/PinLock.tsx src/components/Profile.tsx src/components/GlobalSearch.tsx src/components/GlobalMagicImport.tsx src/components/Toast.tsx
git commit -m "feat: unify Apple styling across secure workflows"
```

---

### Task 7: Browser QA, Regression Cleanup, and Final Verification

**Files:**
- Inspect and, only after reproducing a defect, modify the exact files touched in Tasks 1–6 that own that defect
- Do not modify: database schema files or API behavior

**Interfaces:**
- Validates all prior task outputs together

- [ ] **Step 1: Start the application and inspect phone light mode**

Run: `npm run dev`

At a representative 390×844 viewport, verify auth/unlock, dashboard, wallet stack, Visa/RuPay proportions, each vault list, sheets, bottom navigation, scrolling, and safe-area clearance.

- [ ] **Step 2: Inspect phone dark mode and reduced motion**

Verify readable card data, grouped surface separation, focus states, navigation contrast, and no essential interaction depending on animation.

- [ ] **Step 3: Inspect desktop light and dark modes**

At a representative 1440×900 viewport, verify sidebar, toolbar, maximum content width, wallet card grid, keyboard search, dialogs, profile groups, and responsive transitions.

- [ ] **Step 4: Fix only defects reproduced during QA**

For each behavioral defect, first add a focused failing integrity assertion or component-level test when practical, confirm RED, apply the smallest fix, and confirm GREEN. Pure optical spacing/color corrections must be documented in the final diff summary and re-screenshot after adjustment.

- [ ] **Step 5: Run final automated verification**

```bash
node --test tests/project-integrity.test.mjs
npm run lint
npm run build
git diff --check
git status --short
```

Expected: integrity tests pass, build exits 0, and diff check is clean. Existing lint debt may remain only if unchanged; report exact errors and warnings instead of claiming lint is clean.

- [ ] **Step 6: Review final diff for forbidden scope changes**

Run: `git diff --stat HEAD~6..HEAD && git diff HEAD~6..HEAD -- '*.sql' 'src/lib/crypto.ts' 'src/lib/biometrics.ts' 'src/app/api/**'`

Expected: no schema, encryption, biometric protocol, or API behavior changes.

- [ ] **Step 7: Commit verified QA corrections**

```bash
git add src/app/globals.css src/app/page.tsx src/components/CardLogos.tsx src/components/PaymentCard.tsx src/components/WalletVault.tsx src/components/Auth.tsx src/components/PinLock.tsx src/components/Dashboard.tsx src/components/PasswordVault.tsx src/components/DocumentVault.tsx src/components/NotesVault.tsx src/components/BankVault.tsx src/components/Profile.tsx src/components/GlobalSearch.tsx src/components/GlobalMagicImport.tsx src/components/Toast.tsx src/components/Skeleton.tsx src/components/EmptyState.tsx tests/project-integrity.test.mjs
git commit -m "fix: polish responsive Apple vault experience"
```

Skip this commit when QA requires no corrections.
