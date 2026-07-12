# Responsive Header and Sheet System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the global app header with one adaptive Apple-style toolbar and eliminate mobile dialog clipping through a shared responsive form-sheet contract.

**Architecture:** `src/app/page.tsx` owns the desktop/mobile header and command palette composition. Vault forms opt into one `responsive-form-sheet` class while the existing dialog primitive keeps portal, backdrop, focus, and scroll-lock behavior. `globals.css` defines the entire breakpoint contract so individual vault components no longer fight dialog transforms.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, Framer Motion 12, Base UI/shadcn Dialog and Dropdown Menu, Lucide React.

## Global Constraints

- Preserve all existing search, Magic Import, theme, profile, form, validation, encryption, persistence, and destructive-action behavior.
- Do not modify Supabase operations, schemas, authentication, or encryption.
- Do not add dependencies or new automated test cases.
- Mobile target is 400x863 with no horizontal overflow or unreachable form controls.
- Desktop targets are 1024px and 1440px.
- Keep the desktop sidebar and mobile bottom tab bar unchanged.
- Read relevant documentation in `node_modules/next/dist/docs/` before editing.

---

### Task 1: Rebuild the Adaptive Header and Command Palette

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: existing `activeTab`, `searchOpen`, `setSearchOpen`, `setIsGlobalImportOpen`, `resolvedTheme`, `setTheme`, `handleNavigate`, avatar values, and global-search state.
- Produces: desktop toolbar, mobile title bar, mobile More menu, and responsive command palette.

- [ ] **Step 1: Import the existing dropdown menu primitives and More icon**

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
```

- [ ] **Step 2: Derive one active title**

```tsx
const activeTitle = ALL_TABS_WITH_PROFILE.find((item) => item.tab === activeTab)?.label ?? "Dashboard";
```

- [ ] **Step 3: Replace the complete current header block**

```tsx
<header className="vault-header">
  <div className="vault-header-leading">
    <span className="vault-header-title">{activeTitle}</span>
  </div>

  <button type="button" onClick={() => setSearchOpen(true)} className="vault-header-search" aria-label="Search your vault">
    <SearchIcon aria-hidden="true" />
    <span>Search your vault</span>
    <kbd>⌘K</kbd>
  </button>

  <div className="vault-header-actions">
    <button type="button" onClick={() => setIsGlobalImportOpen(true)} className="vault-header-import">
      <Wand2Icon aria-hidden="true" /><span>Magic Import</span>
    </button>
    <button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="vault-header-icon vault-header-theme" aria-label="Toggle theme">
      {resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
    <button type="button" onClick={() => handleNavigate("profile")} className="vault-header-profile" aria-label="Open profile">
      <span className={activeTab === "profile" ? "is-active" : ""}>{avatarUrl ? <img src={avatarUrl} alt="" /> : avatarLetter}</span>
    </button>
    <button type="button" onClick={() => setSearchOpen(true)} className="vault-header-icon vault-header-mobile-search" aria-label="Search"><SearchIcon /></button>
    <DropdownMenu>
      <DropdownMenuTrigger className="vault-header-icon vault-header-more" aria-label="More actions"><MoreHorizontalIcon /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="vault-header-menu">
        <DropdownMenuItem onClick={() => setIsGlobalImportOpen(true)}><Wand2Icon />Magic Import</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}{resolvedTheme === "dark" ? "Light appearance" : "Dark appearance"}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleNavigate("profile")}><UserCircleIcon />Profile</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</header>
```

Desktop displays search/import/theme/profile and hides mobile search/More. Mobile displays title/search/More and hides import/theme/profile.

- [ ] **Step 4: Apply dedicated classes to the command palette**

Replace its positioning class with `vault-command-palette` and inner surface class with `vault-command-surface`. Add `aria-label="Search the vault"` to the palette container. Preserve the current input and results logic.

- [ ] **Step 5: Remove the duplicated mobile content title**

Delete the `apple-large-title md:hidden` heading above the always-mounted tab content. The header now names the destination on every breakpoint.

- [ ] **Step 6: Verify compilation**

Run: `npm run build`

Expected: Next.js compilation, TypeScript, and static generation complete with exit code 0.

- [ ] **Step 7: Commit the header composition**

```bash
git add src/app/page.tsx
git commit -m "feat: rebuild adaptive vault header"
```

### Task 2: Migrate Vault Forms to One Responsive Sheet Contract

**Files:**
- Modify: `src/components/PasswordVault.tsx`
- Modify: `src/components/DocumentVault.tsx`
- Modify: `src/components/NotesVault.tsx`
- Modify: `src/components/WalletVault.tsx`
- Modify: `src/components/BankVault.tsx`
- Modify: `src/components/GlobalMagicImport.tsx`

**Interfaces:**
- Consumes: existing `DialogContent` instances and form content.
- Produces: `responsive-form-sheet` on add/edit forms and `responsive-import-sheet` on Magic Import, with no form-logic changes.

- [ ] **Step 1: Replace the add/edit dialog class in PasswordVault**

```tsx
<DialogContent className="responsive-form-sheet sm:max-w-sm">
```

- [ ] **Step 2: Replace the upload dialog class in DocumentVault**

```tsx
<DialogContent className="responsive-form-sheet sm:max-w-sm">
```

Do not change the separate 90vh document-preview dialog.

- [ ] **Step 3: Replace the form dialog classes in Notes, Wallet, and Bank**

```tsx
<DialogContent className="responsive-form-sheet sm:max-w-lg">
<DialogContent className="responsive-form-sheet sm:max-w-md">
<DialogContent className="responsive-form-sheet sm:max-w-md">
```

Respectively apply those exact classes to NotesVault, WalletVault, and BankVault.

- [ ] **Step 4: Move Magic Import to the specialized contract**

```tsx
<DialogContent className="responsive-import-sheet sm:max-w-xl p-0 overflow-hidden [&>button]:hidden">
```

- [ ] **Step 5: Preserve Wallet card-details sheet**

Leave `wallet-mobile-sheet` unchanged because it is a details surface with its own bottom-tab clearance contract.

- [ ] **Step 6: Verify only intended DialogContent instances changed**

Run: `rg -n "responsive-(form|import)-sheet|apple-bottom-sheet" src/components/{PasswordVault,DocumentVault,NotesVault,WalletVault,BankVault,GlobalMagicImport}.tsx`

Expected: every add/edit form matches the new contract; no add/edit form retains `apple-bottom-sheet`; `wallet-mobile-sheet` remains present separately.

- [ ] **Step 7: Verify compilation and commit**

Run: `npm run build`

Expected: exit code 0.

```bash
git add src/components/PasswordVault.tsx src/components/DocumentVault.tsx src/components/NotesVault.tsx src/components/WalletVault.tsx src/components/BankVault.tsx src/components/GlobalMagicImport.tsx
git commit -m "fix: unify responsive vault forms"
```

### Task 3: Replace Header and Dialog CSS Contracts

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `vault-header*`, `vault-command-*`, `responsive-form-sheet`, and `responsive-import-sheet` classes from Tasks 1–2.
- Produces: exact desktop/mobile geometry, safe-area behavior, focus visibility, and reduced-motion behavior.

- [ ] **Step 1: Remove obsolete adaptive-header selectors**

Delete `.ios-mobile-header`, `.apple-adaptive-header`, `.apple-header-title`, `.apple-header-search`, `.apple-header-actions`, `.apple-mobile-identity`, and their media-query descendants. Remove the generic `[role="dialog"].apple-bottom-sheet` rule after all migrated forms no longer use it.

- [ ] **Step 2: Add desktop header and command palette geometry**

```css
.vault-header { position: relative; z-index: 35; display: grid; grid-template-columns: minmax(160px,1fr) minmax(280px,420px) minmax(260px,1fr); min-height: 64px; align-items: center; gap: 20px; padding: 0 24px; border-bottom: 1px solid var(--separator); background: color-mix(in srgb,var(--elevated-bg) 84%,transparent); backdrop-filter: saturate(180%) blur(24px); }
.vault-header-title { overflow: hidden; font-size: 16px; font-weight: 680; letter-spacing: -.025em; text-overflow: ellipsis; white-space: nowrap; }
.vault-header-search { display: flex; min-width: 0; height: 38px; align-items: center; gap: 9px; border: 1px solid var(--separator); border-radius: 12px; padding: 0 12px; background: var(--fill-tertiary); color: var(--muted-foreground); }
.vault-header-search span { overflow: hidden; flex: 1; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.vault-header-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; }
.vault-header-import { display: flex; height: 38px; align-items: center; gap: 7px; border-radius: 12px; padding: 0 13px; background: color-mix(in srgb,var(--system-blue) 11%,transparent); color: var(--system-blue); font-size: 13px; font-weight: 650; }
.vault-header-icon,.vault-header-profile { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; color: var(--muted-foreground); }
.vault-header-mobile-search,.vault-header-more { display: none; }
.vault-command-palette { position: fixed; z-index: 50; top: 76px; left: 50%; width: min(540px,calc(100vw - 32px)); transform: translateX(-50%); }
.vault-command-surface { overflow: hidden; border: 1px solid var(--separator); border-radius: 20px; background: var(--elevated-bg); box-shadow: 0 26px 70px rgba(0,0,0,.22); }
```

- [ ] **Step 3: Add the robust desktop dialog contract**

```css
[data-slot="dialog-content"].responsive-form-sheet,
[data-slot="dialog-content"].responsive-import-sheet { width: calc(100% - 32px); max-height: 84dvh; overflow-y: auto; border: 1px solid var(--separator); border-radius: 24px; background: var(--elevated-bg); box-shadow: 0 28px 80px rgba(0,0,0,.22); }
```

Do not override desktop `top`, `left`, or transforms; Base UI's centered modal geometry remains authoritative.

- [ ] **Step 4: Add mobile header, palette, and bottom-sheet geometry**

```css
@media (max-width: 767px) {
  .vault-header { grid-template-columns: minmax(0,1fr) auto; min-height: calc(56px + env(safe-area-inset-top,0px)); padding: env(safe-area-inset-top,0px) 12px 0 16px; }
  .vault-header-title { font-size: 17px; }
  .vault-header-search,.vault-header-import,.vault-header-theme,.vault-header-profile { display: none; }
  .vault-header-mobile-search,.vault-header-more { display: grid; width: 40px; height: 40px; border-radius: 999px; }
  .vault-command-palette { top: calc(68px + env(safe-area-inset-top,0px)); left: 12px; right: 12px; width: auto; transform: none; }
  .vault-command-surface { border-radius: 22px; }

  [data-slot="dialog-content"].responsive-form-sheet,
  [data-slot="dialog-content"].responsive-import-sheet { top: auto !important; right: 0 !important; bottom: 0 !important; left: 0 !important; width: 100% !important; max-width: none !important; max-height: min(82dvh,720px); transform: none !important; overflow-x: hidden; overflow-y: auto; margin: 0 !important; padding: 18px 20px calc(22px + env(safe-area-inset-bottom,0px)); border-radius: 28px 28px 0 0 !important; }
  [data-slot="dialog-content"].responsive-import-sheet { max-height: min(88dvh,760px); padding: 0; }
  [data-slot="dialog-content"].responsive-form-sheet [data-slot="dialog-close"] { top: 10px; right: 12px; width: 44px; height: 44px; border-radius: 999px; }
}
```

- [ ] **Step 5: Add reduced-motion safeguards**

```css
@media (prefers-reduced-motion: reduce) {
  .vault-command-palette,
  [data-slot="dialog-content"].responsive-form-sheet,
  [data-slot="dialog-content"].responsive-import-sheet { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 6: Verify CSS and build**

Run: `git diff --check -- src/app/globals.css && npm run build`

Expected: no whitespace errors and build exit code 0.

- [ ] **Step 7: Commit the shared responsive styles**

```bash
git add src/app/globals.css
git commit -m "style: rebuild header and responsive sheets"
```

### Task 4: Final Static and Visual Verification

**Files:**
- Modify only when an observed defect requires correction: `src/app/page.tsx`, `src/app/globals.css`, and the migrated vault components.

**Interfaces:**
- Consumes: completed header, search palette, and responsive dialogs.
- Produces: verified 400px mobile and 1024/1440px desktop layouts.

- [ ] **Step 1: Run production verification**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 2: Audit obsolete selectors/classes**

Run: `rg -n "ios-mobile-header|apple-adaptive-header|apple-mobile-identity|apple-bottom-sheet" src/app/page.tsx src/app/globals.css src/components/{PasswordVault,DocumentVault,NotesVault,WalletVault,BankVault,GlobalMagicImport}.tsx`

Expected: no migrated header or form uses obsolete classes. Wallet card details may continue to use only `wallet-mobile-sheet`.

- [ ] **Step 3: Inspect mobile at 400x863**

Open Password, Document, Note, Wallet, Bank, and Magic Import forms. Confirm every sheet spans the viewport, fields and submit controls remain inside the surface, close controls remain visible, content scrolls internally, and no horizontal overflow occurs.

- [ ] **Step 4: Inspect mobile header and search**

Confirm every tab updates the title, Search and More are reachable, More actions work, command results clear the bottom tab bar, and duplicated content titles are absent.

- [ ] **Step 5: Inspect desktop at 1024px and 1440px**

Confirm section title/search/actions remain balanced, the command palette stays centered, and each form is a bounded centered panel with internal scrolling.

- [ ] **Step 6: Run final build after browser-driven corrections**

Run: `npm run build`

Expected: exit code 0.
