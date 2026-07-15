# Authentication Mark Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the blue lock mark from every shared authentication screen without changing authentication or master-key behavior.

**Architecture:** The mark is owned entirely by the presentation-only `AuthShell`, so one component edit and one CSS cleanup propagate to sign-in, request access, invitation, onboarding, and password reset. A structural regression test prevents the mark import, element, and styles from returning.

**Tech Stack:** Next.js 16.2.10 App Router, React 19, TypeScript, CSS Modules, Node test runner.

## Global Constraints

- Keep the upper-right appearance toggle.
- Keep all existing headings, forms, segmented navigation, motion, responsive behavior, and safe-area handling.
- Do not change Supabase authentication, invitation handling, onboarding, password reset, or master-key behavior.
- Preserve all unrelated and untracked workspace files.

---

### Task 1: Remove the Shared Authentication Mark

**Files:**
- Modify: `tests/auth-ui-restoration.test.mjs`
- Modify: `src/components/auth/AuthShell.tsx`
- Modify: `src/components/auth/auth-shell.module.css`

**Interfaces:**
- Consumes: the existing presentation-only `AuthShell` API unchanged.
- Produces: the same `AuthShell` API without the decorative blue lock mark.

- [ ] **Step 1: Write the failing structural regression assertion**

Extend the shared-shell test with:

```js
assert.doesNotMatch(shell, /AppleLockIcon|styles\.mark/);
assert.doesNotMatch(css, /\.mark(?:\s|\{|\.)/);
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --test tests/auth-ui-restoration.test.mjs`

Expected: FAIL because `AuthShell.tsx` still imports and renders `AppleLockIcon` through `styles.mark`.

- [ ] **Step 3: Remove the decorative mark**

Delete the `AppleLockIcon` import and this element from `AuthShell.tsx`:

```tsx
<div className={styles.mark} aria-hidden="true">
  <AppleLockIcon />
</div>
```

Delete the `.mark`, `.mark svg`, and mobile `.mark` rules from `auth-shell.module.css`. Do not alter the theme toggle or the public `AuthShell` props.

- [ ] **Step 4: Run focused and repository verification**

Run:

```bash
node --test tests/auth-ui-restoration.test.mjs
npm run lint
npx tsc --noEmit
npm test
```

Expected: all commands exit successfully and all repository tests pass.

- [ ] **Step 5: Visually verify desktop and mobile sign-in**

Run the local application and inspect `/login` at 1440×900 and 390×844. Confirm the heading begins the authentication rail, the appearance toggle remains, and `document.documentElement.scrollWidth` equals the viewport width.

- [ ] **Step 6: Commit**

```bash
git add tests/auth-ui-restoration.test.mjs src/components/auth/AuthShell.tsx src/components/auth/auth-shell.module.css
git commit -m "style: remove auth lock mark"
```
