# Product and Help Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build six accurate, responsive public product and help pages within the existing Velora Vault design system.

**Architecture:** Small Next.js route files provide metadata and select a typed page configuration. Shared server-rendered product sections and CSS-based product visuals avoid duplication. The help hub is a focused client component because filtering is interactive.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Lucide React, Node test runner

## Global Constraints

- Keep all work on `main`.
- Preserve the current Velora Vault public header, footer, white light canvas, and pure black dark canvas.
- Use Bitwarden only for hierarchy and interaction inspiration.
- Use “Get started free” for account actions.
- Do not use em dash characters or entities.
- Do not make unsupported product or security claims.

---

### Task 1: Public page contracts

**Files:**
- Create: `tests/product-pages.test.mjs`

**Interfaces:**
- Consumes: requested route paths and public page conventions
- Produces: structural contracts for route metadata, sections, integration, and responsive CSS

- [ ] Write tests that require all six route files, unique metadata paths, shared public shell usage, content landmarks, search entries, footer links, sitemap entries, responsive breakpoints, and no em dash characters.
- [ ] Run `node --test tests/product-pages.test.mjs` and confirm it fails because the routes do not exist.

### Task 2: Shared product page system

**Files:**
- Create: `src/components/dreelio/product-pages/product-page-data.ts`
- Create: `src/components/dreelio/product-pages/ProductPageContent.tsx`
- Create: `src/components/dreelio/product-pages/ProductPageVisual.tsx`
- Create: `src/components/dreelio/product-pages/product-pages.module.css`

**Interfaces:**
- Consumes: `ProductPageId`
- Produces: `ProductPageContent({ page }: { page: ProductPageId })`

- [ ] Define typed, product-specific copy for password manager, how it works, secure documents, digital wallet, and Magic Import.
- [ ] Implement the shared semantic section hierarchy and CSS-only Velora product panels.
- [ ] Implement full-width, dark-mode, narrow-screen, focus, and reduced-motion styling.
- [ ] Run `node --test tests/product-pages.test.mjs` and confirm the shared component assertions pass.

### Task 3: Product routes

**Files:**
- Create: `src/app/password-manager/page.tsx`
- Create: `src/app/how-it-works/page.tsx`
- Create: `src/app/features/secure-documents/page.tsx`
- Create: `src/app/features/digital-wallet/page.tsx`
- Create: `src/app/features/magic-import/page.tsx`

**Interfaces:**
- Consumes: `PublicPageShell`, `pageMetadata`, and `ProductPageContent`
- Produces: five server-rendered public routes

- [ ] Add unique metadata and render each configuration inside `PublicPageShell`.
- [ ] Run `node --test tests/product-pages.test.mjs` and confirm route assertions pass.

### Task 4: Help hub

**Files:**
- Create: `src/app/help/page.tsx`
- Create: `src/components/dreelio/help/HelpPageContent.tsx`
- Create: `src/components/dreelio/help/help-page.module.css`

**Interfaces:**
- Produces: local article filtering and links to product, security, recovery, pricing, and contact destinations

- [ ] Add the help route metadata and public shell.
- [ ] Implement a labeled local search input, topic cards, filtered answers with a live result count, and clear recovery boundaries.
- [ ] Add responsive, dark-mode, focus, and reduced-motion styles.
- [ ] Run `node --test tests/product-pages.test.mjs` and confirm help assertions pass.

### Task 5: Discovery integration

**Files:**
- Modify: `src/components/dreelio/data.ts`
- Modify: `src/app/sitemap.ts`

**Interfaces:**
- Produces: navigation, search, footer, and crawler discovery for every new route

- [ ] Point Features to `/password-manager`, add every new page to search, extend footer destinations, and add dated sitemap records.
- [ ] Run `node --test tests/product-pages.test.mjs` and confirm all contract tests pass.

### Task 6: Verification and commit

**Files:**
- Verify all files above

**Interfaces:**
- Produces: a tested commit on `main`

- [ ] Run `git diff --check`.
- [ ] Run the em dash repository scan.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Render all six routes at desktop and 390 px mobile widths and confirm no horizontal overflow.
- [ ] Commit the exact tracked changes without staging reference screenshots.

