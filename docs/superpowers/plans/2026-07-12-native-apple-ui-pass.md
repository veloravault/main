# Native Apple UI Second-Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Velora Vault surface structurally resemble Apple ecosystem interfaces through grouped lists, responsive sheets, a mobile Wallet stack, native selection chrome, consistent typography, and restrained materials.

**Architecture:** Extend the shared CSS system and introduce three presentation primitives: `AppleGroupedList`, `ResponsiveSheetFrame`, and `SelectionToolbar`. Existing feature components keep all Supabase, encryption, search, and state logic while adopting these primitives; `PaymentCard` and `WalletVault` own card stacking and expansion.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, Framer Motion 12, Lucide React, Node test runner.

## Global Constraints

- Preserve SQL, RLS, encryption, API routes, auth, PIN/biometric storage, cache keys, and persisted payload formats.
- Use five mobile primary destinations and keep Bank Accounts/Profile reachable through existing alternate entry points.
- Use the approved 34/22/17/15/13/11px typography scale.
- Keep gradients on payment cards and small icon wells only.
- Respect safe areas, keyboard focus, 44px touch targets, and reduced motion.
- Add no package dependency.
- Do not stage the pre-existing untracked `public/visa_transparent.svg`.

---

### Task 1: Shared Native Apple Primitives

**Files:**
- Create: `src/components/ui/apple-grouped-list.tsx`
- Create: `src/components/ui/responsive-sheet-frame.tsx`
- Create: `src/components/SelectionToolbar.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Produces: `AppleGroupedList`, `AppleGroupedRow`, and `AppleGroupLabel`
- Produces: `ResponsiveSheetFrame({ children, className })`
- Produces: `SelectionToolbar({ count, onCancel, onDelete })`
- Produces CSS classes: `.apple-grouped-list`, `.apple-grouped-row`, `.apple-bottom-sheet`, `.apple-selection-toolbar`, `.apple-pressed`, `.type-large-title`, `.type-section-title`, `.type-row-title`, `.type-supporting`, `.type-metadata`, `.type-group-label`

- [ ] Add a failing integrity test that requires all three files, exported symbols, typography classes, bottom-sheet safe-area padding, grouped row separators, pressed state, and reduced-motion coverage.
- [ ] Run `node --test --test-name-pattern="native Apple primitives" tests/project-integrity.test.mjs` and confirm it fails because the files/classes do not exist.
- [ ] Implement semantic list/row wrappers, a dialog-content framing wrapper, the selection toolbar, typography tokens, single material recipe, and optional `navigator.vibrate(10)` guarded by `"vibrate" in navigator`.
- [ ] Run the targeted test and full integrity suite; expect all tests to pass.
- [ ] Commit with `git add src/components/ui/apple-grouped-list.tsx src/components/ui/responsive-sheet-frame.tsx src/components/SelectionToolbar.tsx src/app/globals.css tests/project-integrity.test.mjs && git commit -m "feat: add native Apple interface primitives"`.

### Task 2: Single Mobile Title and Responsive Sheets

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/PasswordVault.tsx`
- Modify: `src/components/DocumentVault.tsx`
- Modify: `src/components/NotesVault.tsx`
- Modify: `src/components/WalletVault.tsx`
- Modify: `src/components/BankVault.tsx`
- Modify: `src/components/GlobalMagicImport.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Consumes: `ResponsiveSheetFrame`
- Preserves: all existing dialog open/close handlers and validation states

- [ ] Add a failing test requiring one mobile large-title owner in `page.tsx`, `ResponsiveSheetFrame` adoption in each create/import flow, `.apple-bottom-sheet` mobile positioning, a sheet grabber, and centered desktop dialog media rules.
- [ ] Run `node --test --test-name-pattern="single mobile title|responsive sheets" tests/project-integrity.test.mjs` and confirm RED.
- [ ] Hide per-feature `h2` headings on mobile while keeping them visible on desktop; leave `page.tsx` as the only mobile large-title owner.
- [ ] Wrap each dialog’s content body with `ResponsiveSheetFrame`; style it as a bottom-attached sheet below 768px and a centered dialog at 768px and above.
- [ ] Run integrity tests and `npm run build`; expect pass and exit 0.
- [ ] Commit with `git add src/app/page.tsx src/app/globals.css src/components/PasswordVault.tsx src/components/DocumentVault.tsx src/components/NotesVault.tsx src/components/WalletVault.tsx src/components/BankVault.tsx src/components/GlobalMagicImport.tsx tests/project-integrity.test.mjs && git commit -m "feat: add native mobile titles and bottom sheets"`.

### Task 3: Grouped Vault Lists and Selection Chrome

**Files:**
- Modify: `src/components/PasswordVault.tsx`
- Modify: `src/components/DocumentVault.tsx`
- Modify: `src/components/NotesVault.tsx`
- Modify: `src/components/BankVault.tsx`
- Modify: `src/components/Skeleton.tsx`
- Modify: `src/components/EmptyState.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Consumes: `AppleGroupedList`, `AppleGroupedRow`, `AppleGroupLabel`, `SelectionToolbar`
- Preserves: component props, selection sets, focus-by-ID, CRUD, upload, scan, cache, and encryption calls

- [ ] Add a failing test requiring grouped-list primitives and `SelectionToolbar` in all four vault surfaces, plus matching skeleton and empty-state classes.
- [ ] Run `node --test --test-name-pattern="vaults use native grouped lists" tests/project-integrity.test.mjs` and confirm RED.
- [ ] Convert each outer list container into one grouped list, each item wrapper into a grouped row, and section captions into group labels; retain existing expanded content inside its owning row.
- [ ] Replace mobile floating bulk bars with `SelectionToolbar` while keeping desktop bulk controls visible at the list header.
- [ ] Apply the same row geometry to skeletons and empty states and remove redundant per-row shadows/borders through scoped CSS.
- [ ] Run integrity tests and production build; expect pass and exit 0.
- [ ] Commit with `git add src/components/PasswordVault.tsx src/components/DocumentVault.tsx src/components/NotesVault.tsx src/components/BankVault.tsx src/components/Skeleton.tsx src/components/EmptyState.tsx src/app/globals.css tests/project-integrity.test.mjs && git commit -m "feat: convert vaults to native grouped lists"`.

### Task 4: Wallet Stack, Settings Profile, and Motion

**Files:**
- Modify: `src/components/PaymentCard.tsx`
- Modify: `src/components/WalletVault.tsx`
- Modify: `src/components/Profile.tsx`
- Modify: `src/components/Toast.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/project-integrity.test.mjs`

**Interfaces:**
- Extends: `PaymentCardProps` with `stacked: boolean` and `active: boolean`
- Consumes: grouped-list and selection primitives
- Preserves: network-logo renderer, wallet CRUD, card detail fields, Profile actions, and confirmations

- [ ] Add a failing test requiring `stacked`/`active`, `.apple-wallet-stack`, `.apple-wallet-card-active`, Profile group labels for Account/Security/Appearance/Data/Danger Zone, and the shared spring timing variable.
- [ ] Run `node --test --test-name-pattern="Wallet stack|Settings profile" tests/project-integrity.test.mjs` and confirm RED.
- [ ] Add mobile negative margins and z-index ordering to the wallet stack; separate the active card, expose its details, and retain a two-column desktop grid.
- [ ] Reorganize Profile’s existing controls into five labeled grouped sections without changing callbacks or destructive confirmations.
- [ ] Standardize sheet/card/nav/toast motion on one spring family and use pressed-state styling only on spatial controls.
- [ ] Run integrity tests and production build; expect pass and exit 0.
- [ ] Commit with `git add src/components/PaymentCard.tsx src/components/WalletVault.tsx src/components/Profile.tsx src/components/Toast.tsx src/app/globals.css tests/project-integrity.test.mjs && git commit -m "feat: add Wallet stacking and Settings profile"`.

### Task 5: Responsive Visual QA and Final Verification

**Files:**
- Modify only files from Tasks 1-4 when a reproduced defect identifies the owning file

- [ ] Run `node --test tests/project-integrity.test.mjs`; expect zero failures.
- [ ] Run `npm run build`; expect compilation, TypeScript, and route generation to finish successfully.
- [ ] Run `npm run lint`; compare against the known baseline of 20 errors and 10 warnings and require no new issues.
- [ ] Run `git diff --check`; expect no whitespace errors.
- [ ] Inspect 390x844 and 1440x900 light/dark viewports in the local browser. Verify single titles, sheet attachment, grouped rows, Wallet stack, Settings Profile, selection toolbar, pressed/focus states, and safe-area clearance without entering credentials.
- [ ] For every reproducible defect, add a failing integrity assertion where practical, implement the smallest correction, rerun the relevant test, and recapture the affected viewport.
- [ ] Commit verified corrections with the exact affected paths and message `fix: polish native Apple interface details`; skip the commit when no correction is needed.
