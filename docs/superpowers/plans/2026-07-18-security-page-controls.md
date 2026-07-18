# Security Page Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `/security` with concise, accurate descriptions of the security and billing-integrity controls already shipped.

**Architecture:** Extend the existing `SecurityPageContent` visual story with one “Protection in practice” section. Copy is grouped into local device, account/data access, and billing integrity, while existing limitation and threat-boundary sections remain the source of truth.

**Tech Stack:** Next.js 16 App Router, React 19, Framer Motion, CSS Modules, Node test runner

## Global Constraints

- Describe implemented controls only; do not strengthen cryptographic claims.
- Keep payment integrity separate from vault encryption.
- Preserve master-key recovery, endpoint-threat, metadata, and AI-import limitations.
- Reuse public-page tokens and reduced-motion behavior.
- Do not modify `.claude/settings.json`.

---

### Task 1: Add factual implemented-control coverage

**Files:**
- Modify: `tests/landing-trust.test.mjs`
- Modify: `src/components/dreelio/SecurityPageContent.tsx`
- Modify: `src/components/dreelio/SecurityPageContent.module.css`

**Interfaces:**
- Consumes: existing public `Nav`, `Footer`, and shared landing motion tokens.
- Produces: a semantic `#implemented-controls` section containing three control groups.

- [ ] **Step 1: Write the failing trust test**

Add assertions for exact factual phrases or stable headings covering:

```js
assert.match(page, /Protection in practice/);
assert.match(page, /bound to the authenticated account/i);
assert.match(page, /auto-lock/i);
assert.match(page, /clipboard/i);
assert.match(page, /sign out other devices/i);
assert.match(page, /row-level security/i);
assert.match(page, /private document storage/i);
assert.match(page, /webhook signature/i);
assert.match(page, /idempotent/i);
assert.match(page, /stale subscription events/i);
```

Retain the existing negative/limitation assertions already in the test.

- [ ] **Step 2: Run the trust test and verify RED**

Run: `node --test tests/landing-trust.test.mjs`

Expected: FAIL because the new section and shipped-control language are absent.

- [ ] **Step 3: Add the semantic control section**

Add a section after implemented cryptography facts with three articles:

```tsx
<section id="implemented-controls" aria-labelledby="implemented-controls-title">
  <p className={shared.eyebrow}>Protection in practice</p>
  <h2 id="implemented-controls-title">Security beyond encryption</h2>
  <div className={styles.controlGrid}>
    <article>{/* This device */}</article>
    <article>{/* Account and data */}</article>
    <article>{/* Billing integrity */}</article>
  </div>
</section>
```

The copy must state that local wrappers are bound to the authenticated account and re-checked after biometric prompts; auto-lock, clipboard clearing, and other-session sign-out are user controls; row-level policies, membership gates, and private storage authorize data access; Razorpay webhook signatures, idempotency, and stale-event handling protect subscription state.

- [ ] **Step 4: Style with existing public tokens**

Create a responsive three-column grouped-card layout using existing `--surface`, `--card-white`, `--line`, `--ink`, and `--ink-body` tokens. Collapse to one column below the existing mobile breakpoint. Use transforms/opacity only for any reveal motion.

- [ ] **Step 5: Run trust and security visual tests**

Run: `node --test tests/landing-trust.test.mjs tests/security-page-visual.test.mjs`

Expected: PASS with all existing limitation assertions preserved.

- [ ] **Step 6: Commit the security copy**

```bash
git add tests/landing-trust.test.mjs src/components/dreelio/SecurityPageContent.tsx src/components/dreelio/SecurityPageContent.module.css
git commit -m "docs: update public security controls"
```

