# Mobile Vault White Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every authenticated vault screen use a pure-white mobile canvas in light mode while preserving true-black mobile dark mode.

**Architecture:** The authenticated tabs already share `.ios-app-shell` and `.ios-content-scroll` in `src/app/globals.css`. Override the background token only inside that shell and make its canvas solid, guarded by the existing source-level integrity suite, so Dashboard, Passwords, Documents, Notes, Wallet, Bank Accounts, and Settings remain consistent without changing public, authentication, card, or portal surfaces.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Node.js built-in test runner, CSS custom properties.

## Global Constraints

- Apply only below 768px.
- Use `#FFFFFF` for the authenticated light-mode mobile canvas while retaining the global mobile `#F2F2F7` token.
- Preserve the mobile `.dark` background at `#000000`.
- Do not alter desktop backgrounds, card surfaces, separators, safe areas, scrolling, header behavior, or bottom tab bar behavior.
- Preserve all unrelated working-tree changes.

---

### Task 1: Shared Mobile Vault Canvas

**Files:**
- Modify: `tests/project-integrity.test.mjs:276`
- Modify: `src/app/globals.css:770-840`

**Interfaces:**
- Consumes: the existing `.ios-content-scroll` shell class and mobile `--background` CSS custom property.
- Produces: a solid white light-mode mobile canvas inherited by every authenticated vault tab; no new JavaScript or component interface.

- [x] **Step 1: Write the failing regression test**

Add this source-level test beside the existing mobile shell test in `tests/project-integrity.test.mjs`:

```js
test("mobile vault uses a solid white light-mode canvas", () => {
  const css = read("src/app/globals.css");
  const mobileShellStart = css.indexOf("@media (max-width: 767px) {", css.indexOf(".ios-mobile-tabbar"));
  const mobileShellEnd = css.indexOf("\n}\n\n@media (prefers-reduced-motion", mobileShellStart) + 2;
  const mobileShellCss = css.slice(mobileShellStart, mobileShellEnd);

  assert.ok(mobileShellStart >= 0 && mobileShellEnd > mobileShellStart);
  assert.match(mobileShellCss, /:root\s*\{[^}]*--background:\s*#F2F2F7;/);
  assert.match(mobileShellCss, /\.ios-app-shell\s*\{[^}]*--background:\s*#FFFFFF;/);
  assert.match(mobileShellCss, /\.dark \.ios-app-shell\s*\{[^}]*--background:\s*#000000;/);
  assert.match(mobileShellCss, /\.ios-content-scroll\s*\{[^}]*background:\s*var\(--background\);/);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --test-name-pattern="mobile vault uses a solid white light-mode canvas" tests/project-integrity.test.mjs
```

Expected: FAIL because the current mobile token is `#F2F2F7` and `.ios-content-scroll` uses a linear gradient.

- [x] **Step 3: Implement the shared CSS correction**

In the existing `@media (max-width: 767px)` block in `src/app/globals.css`, change only the light-mode background token and the scroll-canvas background:

```css
  .ios-app-shell {
    --background: #FFFFFF;
  }

  .dark .ios-app-shell {
    --background: #000000;
  }

.ios-content-scroll {
  background: var(--background);
}
```

Leave the global mobile `:root { --background: #F2F2F7; }` and `.dark { --background: #000000; }` rules unchanged.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
node --test --test-name-pattern="mobile vault uses a solid white light-mode canvas" tests/project-integrity.test.mjs
```

Expected: PASS.

- [x] **Step 5: Run regression verification**

Run:

```bash
node --test tests/project-integrity.test.mjs
npm test
npm run lint
npm run build
```

Expected: all integrity tests and the full test suite pass, lint exits successfully, and the production build has no unrelated pre-existing blockers. In the current working tree, the build is separately blocked by a `PublicPageShell.tsx` client import of `src/lib/server/auth.ts`; this plan does not expand the background-only scope to modify that unrelated code.

- [x] **Step 6: Perform mobile visual verification**

At approximately 400px viewport width, verify the live light-mode `--background` and body canvas compute to pure white. The authenticated tab canvas is guarded by the source-level `.ios-content-scroll` assertion because the verification browser does not hold the user's authenticated master-key state. Confirm the mobile `.dark` override remains black in the same regression.

- [x] **Step 7: Commit the focused change**

```bash
git add tests/project-integrity.test.mjs src/app/globals.css docs/superpowers/plans/2026-07-18-mobile-vault-white-background.md
git commit -m "fix: make mobile vault backgrounds white"
```
