# Public Header Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single Utilities dropdown and loose page links with a complete, responsive public-site navigation hierarchy.

**Architecture:** Keep navigation content in `data.ts`, render desktop dropdowns and mobile accordions from the same data in `Nav.tsx`, and retain all visual behavior in the existing CSS module. Use one active desktop panel and one active mobile accordion so competing menus cannot remain open together.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, CSS Modules, Framer Motion, Lucide icons, Node test runner.

## Global Constraints

- Work directly on `main`.
- Do not introduce em dash characters or entities.
- Keep the full desktop menu visible at a 1152px CSS viewport.
- Keep light surfaces white and dark section surfaces black.
- Preserve the working global search, theme toggle, and signed-in CTA behavior.

---

### Task 1: Navigation content contract

**Files:**
- Modify: `tests/landing-trust.test.mjs`
- Modify: `src/components/dreelio/data.ts`

**Interfaces:**
- Produces: `PRODUCT_LINKS`, `UTILITY_LINKS`, `RESOURCE_LINKS`, and `PRIMARY_NAV_LINKS` arrays with `label`, `href`, `description`, and `icon` fields where used.

- [ ] Write assertions for all four navigation groups and every destination.
- [ ] Run `node --test tests/landing-trust.test.mjs` and confirm the new contract fails.
- [ ] Add the navigation data arrays with concise, accurate descriptions.
- [ ] Re-run the focused test and confirm the data contract passes.

### Task 2: Shared desktop dropdowns and mobile accordions

**Files:**
- Modify: `src/components/dreelio/Nav.tsx`
- Modify: `src/components/dreelio/Nav.module.css`
- Test: `tests/landing-trust.test.mjs`

**Interfaces:**
- Consumes: the four navigation arrays from Task 1.
- Produces: desktop controls with `aria-expanded` and `aria-controls`, ordinary dropdown navigation links, and mobile accordion controls using the same route data.

- [ ] Add failing assertions for Products, Utilities, Resources, single-active-panel state, mobile accordion state, descriptive dropdown cards, and responsive classes.
- [ ] Run the focused test and confirm it fails for the missing structure.
- [ ] Replace the utility-specific state and markup with generic desktop and mobile group rendering.
- [ ] Add dropdown panel, link-card, mobile accordion, focus, dark-mode, and 1024px breakpoint styles.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Verification and commit

**Files:**
- Verify: `src/components/dreelio/Nav.tsx`
- Verify: `src/components/dreelio/Nav.module.css`
- Verify: `src/components/dreelio/data.ts`

**Interfaces:**
- Produces: a committed, production-buildable header redesign.

- [ ] Verify dropdown opening and closure at 1440px.
- [ ] Verify the complete desktop menu at 1152px.
- [ ] Verify mobile accordions and zero overflow at 390px.
- [ ] Run `git diff --check`, `npm test`, `npm run lint`, and `npm run build`.
- [ ] Scan changed public sources for forbidden em dash characters and entities.
- [ ] Commit only implementation, test, specification, and plan files.
