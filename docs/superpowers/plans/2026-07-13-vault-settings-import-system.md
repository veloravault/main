# Vault Settings, Import, Navigation, and System UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Profile with responsive Settings, complete mobile navigation, rebuild Magic Import as an editable multi-source workflow, and apply a shared Apple-like interaction system to non-Wallet vault modules.

**Architecture:** Build opt-in client-side preferences, session, connectivity, sheet, toast, state, context-action, and master-detail primitives first. Settings, mobile navigation, Magic Import, Passwords, Documents, Notes, and Bank Accounts consume those interfaces in dependency order; Wallet remains on its existing components and CSS. Supabase remains the persistence/auth layer, while sensitive transformations, backup assembly, draft editing, encryption, and import history stay client-side.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript, Tailwind CSS 4/global CSS, Base UI 1.6 dialogs/menus, Framer Motion 12.42, Supabase JS 2.110, Web Crypto, WebAuthn, Papa Parse 5.5.

## Global Constraints

- Read `AGENTS.md` and the relevant guide under `node_modules/next/dist/docs/` before every code task; this repository's Next.js version may differ from prior knowledge.
- Preserve the existing account-password and master-key separation.
- Do not add master-key change, reset, recovery, rotation, migration, or re-encryption.
- Do not store login credentials in source, plans, tests, logs, screenshots, browser storage setup code, or git history.
- Use credentials supplied out-of-band only for an interactive local browser session.
- Do not modify `src/components/WalletVault.tsx`, `src/components/PaymentCard.tsx`, `src/components/WalletCardDetails.tsx`, `src/components/CardLogos.tsx`, or Wallet-specific CSS selectors.
- Preserve the existing five-tab mobile bottom bar, including Wallet.
- Shared UI foundations must be opt-in and must not alter Wallet through global selectors.
- Do not add dependencies or new automated test files.
- Use production builds, lint/static audits, and signed-in browser verification instead of adding tests.
- Preserve unrelated dirty-worktree changes; stage only the files explicitly assigned to each task.
- Keep Supabase authorization based on authenticated ownership/RLS; never use `user_metadata` for authorization.
- Never persist plaintext vault fields, the master key, PIN wrappers, or biometric wrappers in backup/import history.
- Every new mutation must expose loading, success, failure, disabled, and offline behavior.
- Mobile interactive targets are at least 44px; keyboard focus remains visible; reduced motion removes transforms and springs.

---

### Task 1: Device Preferences and Local Vault Session Utilities

**Files:**
- Create: `src/lib/vaultPreferences.ts`
- Create: `src/lib/vaultSession.ts`
- Create: `src/lib/secureClipboard.ts`
- Create: `src/hooks/useAutoLock.ts`
- Modify: `src/lib/biometrics.ts`
- Modify: `src/components/PinLock.tsx`

**Interfaces:**
- Produces: `VaultPreferences`, `loadVaultPreferences()`, `saveVaultPreferences()`, `subscribeVaultPreferences()`, `clearLocalVaultSession()`, `copySensitiveText()`, `useAutoLock()`, `disableBiometrics()`, and `verifyPinAndRecoverMaster()`.
- Consumes: existing `clearAllCaches()`, `clearKeyCache()`, PIN/biometric storage, and `sessionStorage` key `vault_session_master`.

- [ ] **Step 1: Read local framework guidance and current security utilities**

Run:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,240p' node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
sed -n '1,260p' src/lib/{biometrics,keyCache,vaultCache}.ts
sed -n '1,220p' src/components/PinLock.tsx
```

Expected: browser-dependent utilities remain Client Component imports only.

- [ ] **Step 2: Implement typed device-local preferences**

Create `src/lib/vaultPreferences.ts` with this public contract:

```ts
export type AutoLockMinutes = 0 | 1 | 5 | 15 | 30;
export type ClipboardClearSeconds = 0 | 15 | 30 | 60;

export interface VaultPreferences {
  autoLockMinutes: AutoLockMinutes;
  clipboardClearSeconds: ClipboardClearSeconds;
}

export const DEFAULT_VAULT_PREFERENCES: VaultPreferences = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
};

export function loadVaultPreferences(): VaultPreferences;
export function saveVaultPreferences(patch: Partial<VaultPreferences>): VaultPreferences;
export function subscribeVaultPreferences(listener: (value: VaultPreferences) => void): () => void;
```

Use one versioned localStorage key, validate values against the exact numeric unions, merge valid stored values over defaults, dispatch a same-tab `CustomEvent`, and listen to both that event and the browser `storage` event.

- [ ] **Step 3: Centralize local vault locking**

Create `src/lib/vaultSession.ts`:

```ts
import { clearKeyCache } from "@/lib/keyCache";
import { clearAllCaches } from "@/lib/vaultCache";

export const SESSION_MASTER_KEY = "vault_session_master";

export function clearLocalVaultSession() {
  clearKeyCache();
  clearAllCaches();
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_MASTER_KEY);
  }
}
```

Do not clear the Supabase session, PIN enrollment, biometric enrollment, appearance, or preferences.

- [ ] **Step 4: Add safe clipboard clearing**

Create `src/lib/secureClipboard.ts`:

```ts
import { loadVaultPreferences } from "@/lib/vaultPreferences";

export async function copySensitiveText(value: string): Promise<{ scheduled: boolean }> {
  await navigator.clipboard.writeText(value);
  const seconds = loadVaultPreferences().clipboardClearSeconds;
  if (seconds === 0) return { scheduled: false };
  window.setTimeout(async () => {
    try {
      if ((await navigator.clipboard.readText()) === value) {
        await navigator.clipboard.writeText("");
      }
    } catch {
      // Clipboard read permission can be denied after the original write.
    }
  }, seconds * 1000);
  return { scheduled: true };
}
```

Do not integrate it into Wallet.

- [ ] **Step 5: Implement auto-lock hook**

Create `src/hooks/useAutoLock.ts` with:

```ts
export function useAutoLock(options: {
  enabled: boolean;
  onLock: () => void;
}): void;
```

Load the preference, subscribe to preference changes, listen to `pointerdown`, `keydown`, `touchstart`, `focus`, and `visibilitychange`, throttle activity resets to once per second, and call `onLock` after `minutes * 60_000`. “Immediately” means lock when the document becomes hidden or loses focus, not after every input event.

- [ ] **Step 6: Add biometric disable API**

In `src/lib/biometrics.ts`, export:

```ts
export function disableBiometrics(): void {
  localStorage.removeItem(BIO_ENCRYPTED_KEY);
  localStorage.removeItem(BIO_CRED_ID);
}
```

This disables local unlock references; it must not claim to delete the platform credential from the operating system.

In `src/components/PinLock.tsx`, extract and export the existing successful PIN verification path:

```ts
export async function verifyPinAndRecoverMaster(pin: string): Promise<string>;
```

It must validate the stored salted PIN hash, decrypt the existing local master-key wrapper, reset the attempt counter on success, increment the shared attempt counter on failure, and throw a user-safe error. The rendered `PinLock` component must call the same function so there is only one verification implementation.

- [ ] **Step 7: Verify and commit**

Run:

```bash
rg -n "master|password|email" src/lib/vaultPreferences.ts src/lib/vaultSession.ts src/lib/secureClipboard.ts src/hooks/useAutoLock.ts
git diff --check -- src/lib/vaultPreferences.ts src/lib/vaultSession.ts src/lib/secureClipboard.ts src/hooks/useAutoLock.ts src/lib/biometrics.ts src/components/PinLock.tsx
npm run build
```

Expected: no credential literals; build exits 0.

```bash
git add src/lib/vaultPreferences.ts src/lib/vaultSession.ts src/lib/secureClipboard.ts src/hooks/useAutoLock.ts src/lib/biometrics.ts src/components/PinLock.tsx
git commit -m "feat: add vault device security preferences"
```

---

### Task 2: Actionable Toasts, Connectivity, and Shared State Views

**Files:**
- Create: `src/hooks/useConnectivity.ts`
- Create: `src/components/ConnectivityBanner.tsx`
- Create: `src/components/ui/state-view.tsx`
- Modify: `src/components/Toast.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `ToastOptions`, `ToastHandle`, `useToast()`, `useConnectivity()`, `ConnectivityBanner`, and `StateView`.
- Consumes: Framer Motion and existing theme tokens.

- [ ] **Step 1: Read CSS and client-component guidance**

Run:

```bash
sed -n '1,220p' node_modules/next/dist/docs/01-app/01-getting-started/11-css.md
sed -n '1,240p' src/components/Toast.tsx
sed -n '1,560p' src/app/globals.css
```

- [ ] **Step 2: Extend Toast with actions and deadlines**

Replace the current string-only API with:

```ts
export type ToastType = "success" | "error" | "info" | "warning";
export interface ToastOptions {
  message: string;
  type?: ToastType;
  durationMs?: number | null;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}
export interface ToastHandle { id: string; dismiss: () => void; }
interface ToastContextValue {
  toast: (messageOrOptions: string | ToastOptions, legacyType?: ToastType) => ToastHandle;
}
```

Keep legacy calls working. Render an optional action button, deadline bar, `role="status"` for normal messages, `role="alert"` for errors, top-center mobile positioning, and top-right desktop positioning. Clicking the surface must no longer dismiss a toast that contains an action; provide a labelled close button instead.

- [ ] **Step 3: Implement connectivity state**

Create `src/hooks/useConnectivity.ts`:

```ts
export interface ConnectivityState {
  isOnline: boolean;
  lastChangedAt: number;
}
export function useConnectivity(): ConnectivityState;
```

Initialize from `navigator.onLine`, subscribe to `online`/`offline`, and avoid accessing `navigator` during server evaluation.

Create `ConnectivityBanner` with `isOnline` prop. Render only while offline, use `role="status"`, and copy: “You’re offline. Saved items remain available; changes require a connection.”

- [ ] **Step 4: Add reusable state view**

Create `src/components/ui/state-view.tsx`:

```tsx
export function StateView(props: {
  kind: "empty" | "error" | "offline" | "unsupported";
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}): React.ReactNode;
```

Use one icon, sentence-case copy, optional action, and no large illustration.

- [ ] **Step 5: Add motion, material, focus, toast, and state CSS**

Define opt-in variables/classes:

```css
:root {
  --motion-fast: 140ms;
  --motion-standard: 220ms;
  --ease-apple: cubic-bezier(.25,.8,.25,1);
  --surface-page-dark: #111113;
  --surface-group-dark: #1c1c1e;
  --surface-elevated-dark: #2c2c2e;
}
.system-interactive:focus-visible { outline: 3px solid color-mix(in srgb,var(--primary) 38%,transparent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .system-motion, .system-motion * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
}
```

Scope dark material overrides under `.vault-system-surface`; do not target Wallet selectors.

- [ ] **Step 6: Verify and commit**

Run `npm run build`, `npm run lint`, and a source audit confirming no `.wallet-` selector occurs in the new CSS block. Commit:

```bash
git add src/hooks/useConnectivity.ts src/components/ConnectivityBanner.tsx src/components/ui/state-view.tsx src/components/Toast.tsx src/app/globals.css
git commit -m "feat: add vault state and feedback system"
```

---

### Task 3: Opt-in Adaptive Sheet, Master-Detail, and Context Actions

**Files:**
- Create: `src/components/ui/adaptive-sheet.tsx`
- Create: `src/components/ui/master-detail.tsx`
- Create: `src/components/ui/context-actions.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `AdaptiveSheet`, `AdaptiveSheetHeader`, `AdaptiveSheetBody`, `AdaptiveSheetFooter`, `MasterDetail`, `ContextActions`, and `useLongPress()`.
- Consumes: existing Base UI Dialog/Menu wrappers and `cn()`.

- [ ] **Step 1: Implement AdaptiveSheet**

Use this API:

```tsx
<AdaptiveSheet open={open} onOpenChange={setOpen} title="Title" description="Description" size="md">
  <AdaptiveSheetBody>{content}</AdaptiveSheetBody>
  <AdaptiveSheetFooter>{actions}</AdaptiveSheetFooter>
</AdaptiveSheet>
```

`size` is `"sm" | "md" | "lg"`. Desktop renders a centered Base UI dialog; mobile uses bottom alignment, safe-area footer, a fixed header, scrollable body, and drag indicator. Restore focus through Base UI. Export structural subcomponents so forms do not depend on child selectors.

- [ ] **Step 2: Implement MasterDetail**

```tsx
export function MasterDetail(props: {
  list: React.ReactNode;
  detail: React.ReactNode;
  hasSelection: boolean;
  emptyDetail: React.ReactNode;
  className?: string;
}): React.ReactNode;
```

At `md` and above render a two-column grid; below `md` render only the list because mobile details remain sheets.

- [ ] **Step 3: Implement shared context actions and long press**

```ts
export interface ContextAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}
export function useLongPress(onLongPress: () => void, delayMs?: number): {
  onPointerDown: React.PointerEventHandler;
  onPointerMove: React.PointerEventHandler;
  onPointerUp: React.PointerEventHandler;
  onPointerCancel: React.PointerEventHandler;
};
```

Default delay is 500ms; cancel after 10px movement. `ContextActions` must expose the same action array through explicit More button, desktop context menu, and mobile sheet.

- [ ] **Step 4: Add opt-in responsive CSS**

Use `.adaptive-sheet`, `.vault-master-detail`, and `.vault-context-sheet` selectors only. Do not edit `.responsive-form-sheet`, `.responsive-import-sheet`, `.wallet-mobile-sheet`, `.wallet-page-*`, or `.apple-wallet-*` rules.

- [ ] **Step 5: Verify and commit**

Run build/lint, audit selectors, and commit:

```bash
git add src/components/ui/adaptive-sheet.tsx src/components/ui/master-detail.tsx src/components/ui/context-actions.tsx src/app/globals.css
git commit -m "feat: add adaptive vault interface primitives"
```

---

### Task 4: Responsive Settings Shell, Account, and Appearance

**Files:**
- Create: `src/components/settings/Settings.tsx`
- Create: `src/components/settings/SettingsNavigation.tsx`
- Create: `src/components/settings/AccountSettings.tsx`
- Create: `src/components/settings/AppearanceSettings.tsx`
- Create: `src/components/settings/settings-types.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `Settings({ masterPassword, onLock })` and `SettingsSection = "account" | "security" | "appearance" | "backup" | "danger"`.
- Consumes: Supabase user profile, `next-themes`, Toast, and shared Settings primitives.

- [ ] **Step 1: Define Settings section metadata**

```ts
export type SettingsSection = "account" | "security" | "appearance" | "backup" | "danger";
export interface SettingsProps { masterPassword: string; onLock: () => void; }
```

Use one metadata array for desktop secondary navigation and mobile root rows.

- [ ] **Step 2: Build the responsive shell**

Desktop uses `240px minmax(0,1fr)` inside a `max-w-5xl` surface. Mobile starts on the root grouped list and renders drill-in content with a Back control. Preserve per-section scroll position in refs during the mounted Settings session.

- [ ] **Step 3: Move Account behavior out of Profile**

Port avatar and full-name behavior into `AccountSettings`. Replace `alert()` with inline error plus toast success. Validate avatar type (`image/jpeg`, `image/png`, `image/webp`) and maximum size 5MB before upload. Email remains read-only.

- [ ] **Step 4: Implement Appearance**

Use `theme` rather than only `resolvedTheme` so System remains distinguishable:

```ts
type ThemeChoice = "system" | "light" | "dark";
const choices: ThemeChoice[] = ["system", "light", "dark"];
```

Desktop uses a segmented control; mobile uses selectable grouped rows. Add a live material preview scoped to Settings.

- [ ] **Step 5: Integrate Settings into page navigation**

Create the single manual lock handler in `page.tsx` before rendering Settings:

```ts
const handleLockVault = useCallback(() => {
  clearLocalVaultSession();
  setMasterPassword(null);
  setShowPinLock(hasPinLock());
  setShowFullAuth(!hasPinLock());
  setSearchOpen(false);
  setIsGlobalImportOpen(false);
}, []);
```

Replace the rendered `Profile` component with `<Settings masterPassword={masterPassword} onLock={handleLockVault} />`. Keep the tab identifier `profile` for compatibility with existing navigation/search, but label it “Settings” in header/menu copy. Do not change Wallet mounting or props.

- [ ] **Step 6: Verify responsive layout and commit**

Run build/lint. In browser verify Settings at 390px and 1280px, Account save errors, System/Light/Dark, mobile Back, and desktop secondary selection. Commit:

```bash
git add src/components/settings src/app/page.tsx src/app/globals.css
git commit -m "feat: redesign profile as responsive settings"
```

---

### Task 5: Security Settings, Auto-lock Integration, and Mobile Vault Menu

**Files:**
- Create: `src/components/settings/SecuritySettings.tsx`
- Create: `src/components/MobileVaultMenu.tsx`
- Modify: `src/components/settings/Settings.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 preferences/session/biometric APIs, Task 3 AdaptiveSheet, Supabase auth, and `handleNavigate`.
- Produces: functional Security controls and complete mobile action sheet.

- [ ] **Step 1: Implement Security grouped controls**

Render exact options from `VaultPreferences`. Use a nested AdaptiveSheet on mobile and inline segmented/select controls on desktop. Show biometric Supported/Unavailable and Enabled/Disabled. Disabling calls `disableBiometrics()` after confirmation.

- [ ] **Step 2: Implement current session and sign-out-others**

Use `supabase.auth.getSession()` only to render current-session metadata; use `supabase.auth.getUser()` for the trusted user object. Display browser family/platform derived locally and `user.last_sign_in_at` when available. Invoke:

```ts
const { error } = await supabase.auth.signOut({ scope: "others" });
```

Show progress, success, and failure in-row. Do not render fake other-device entries.

- [ ] **Step 3: Connect auto-lock to the existing lock path**

In `page.tsx`, call `useAutoLock({ enabled: !!sessionUser && !!masterPassword, onLock: handleLockVault })` using the handler created in Task 4. Pass the same handler into MobileVaultMenu. There must be only one cleanup/lock implementation.

- [ ] **Step 4: Build MobileVaultMenu**

Use AdaptiveSheet and exact ordered actions: Bank Accounts, Profile & Settings, Magic Import, Appearance, divider, Lock Vault. Close the sheet before navigation/secondary sheet state changes. Preserve the existing five mobile tabs unchanged.

- [ ] **Step 5: Wire the header overflow**

On mobile, replace the current dropdown contents with the MobileVaultMenu trigger/sheet. Desktop retains current header controls and sidebar. Add `aria-haspopup="dialog"` and active-state labels.

- [ ] **Step 6: Browser verify and commit**

Verify 390px menu navigation, theme choice, Lock Vault return path, 1-minute auto-lock using a temporary preference, biometric toggle state, and sign-out-others response. Verify Wallet tab still opens unchanged. Run build/lint and commit.

---

### Task 6: Encrypted Backup Export and Settings Danger Flows

**Files:**
- Create: `src/lib/vaultBackup.ts`
- Create: `src/components/settings/BackupSettings.tsx`
- Create: `src/components/settings/DangerSettings.tsx`
- Create: `src/components/settings/LocalVerificationSheet.tsx`
- Modify: `src/components/settings/Settings.tsx`

**Interfaces:**
- Produces: `exportEncryptedVaultBackup()`, `BackupManifest`, Backup/Danger settings.
- Consumes: Supabase database/storage, AdaptiveSheet, Toast, existing destructive endpoints.

- [ ] **Step 1: Define versioned backup types**

```ts
export interface BackupManifest {
  format: "veloravault";
  version: 1;
  exportedAt: string;
  appVersion: string;
  counts: Record<"passwords" | "documents" | "notes" | "wallet", number>;
  sha256: string;
}
export interface EncryptedVaultBackup {
  manifest: BackupManifest;
  records: Record<string, unknown[]>;
  documentBlobs: Array<{ storagePath: string; base64Ciphertext: string }>;
}
```

The digest is computed over canonical JSON with `sha256` temporarily empty, then inserted into the final manifest.

- [ ] **Step 2: Fetch encrypted records and blobs**

Select ciphertext rows from `vault_items`, `vault_documents`, `secure_notes`, and `secure_wallet`. Download each referenced `vault_documents.storage_path` without decrypting. Stop on the first missing blob and return a typed error naming the document title.

- [ ] **Step 3: Download `.veloravault` safely**

Serialize, create an `application/json` Blob, use an object URL, click a temporary anchor, revoke the URL, and name the file `velora-vault-YYYY-MM-DD.veloravault`. Never pass `masterPassword` into this module.

- [ ] **Step 4: Build Backup Settings**

Explain encryption/master-key dependency, show counts after a preflight metadata query, require confirmation, render progress by document count, and keep errors inline.

- [ ] **Step 5: Rebuild Danger flows with sheets**

Port Clear Data and Delete Account. Require typed `DELETE`. Build `LocalVerificationSheet` with this contract:

```tsx
export function LocalVerificationSheet(props: {
  open: boolean;
  masterPassword: string;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}): React.ReactNode;
```

If biometrics is enabled, call `unlockWithBiometrics()` and compare the recovered value with `masterPassword`. If PIN is enabled, collect six digits, call `verifyPinAndRecoverMaster()`, and compare the recovered value. If neither is enabled, require re-entry of the current master key and compare in memory. Never log, persist, or send the verification value. Only after `onVerified` may the destructive mutation run. Remove browser alerts and preserve current API/RLS behavior.

- [ ] **Step 6: Audit backup safety and commit**

Run:

```bash
rg -n "decrypt|masterPassword|vault_pin|vault_bio|plaintext" src/lib/vaultBackup.ts
npm run build && npm run lint
```

Expected: no decrypt/master/wrapper access. Browser-download a backup and inspect only manifest/key names, never print values. Commit.

---

### Task 7: Magic Import Domain Model and Source Parsers

**Files:**
- Create: `src/lib/import/types.ts`
- Create: `src/lib/import/normalize.ts`
- Create: `src/lib/import/csv.ts`
- Create: `src/lib/import/validation.ts`
- Modify: `src/app/actions.ts`
- Modify: `src/app/api/scan/route.ts`

**Interfaces:**
- Produces: `ImportDraft`, `ImportSource`, `normalizeImportResult()`, `parseImportCsv()`, `validateDraft()`, and typed AI extraction responses.

- [ ] **Step 1: Define exact draft types**

```ts
export type ImportItemType = "password" | "note" | "bank_account" | "card";
export type Confidence = "high" | "medium" | "low";
export type DuplicateResolution = "unresolved" | "skip" | "keep_both" | "replace";
export interface ImportDraft {
  clientId: string;
  type: ImportItemType;
  title: string;
  fields: Record<string, string>;
  confidence: Record<string, Confidence>;
  included: boolean;
  sourceLabel: string;
  issues: string[];
  duplicate: { matchId: string; label: string } | null;
  duplicateResolution: DuplicateResolution;
}
export type ImportSource =
  | { kind: "paste"; text: string }
  | { kind: "csv" | "browser_csv"; file: File }
  | { kind: "image"; file: File };
```

- [ ] **Step 2: Normalize existing AI results**

Map current `passwords`, `notes`, `bank_accounts`, and `credit_cards` into drafts. Preserve empty fields, generate `crypto.randomUUID()` client IDs, infer low confidence for missing required fields, and run validation after normalization.

- [ ] **Step 3: Parse CSV locally with Papa Parse**

Support common headers case-insensitively: `name/title`, `url/website`, `username/login_username`, `password/login_password`, `note/content`, and bank/card field aliases. Detect browser password CSV when URL/username/password headers coexist. Return row-numbered errors for malformed rows.

- [ ] **Step 4: Type and validate AI extraction**

Server actions/routes must return a discriminated result:

```ts
export type ImportExtractionResponse =
  | { ok: true; drafts: ImportDraft[] }
  | { ok: false; code: "UNSUPPORTED" | "INVALID_INPUT" | "EXTRACTION_FAILED"; message: string };
```

Validate generated JSON shape before returning it to the client. Do not log uploaded plaintext/image content.

- [ ] **Step 5: Verify and commit**

Run build/lint and manually parse one generic CSV, one browser CSV, one pasted text sample, and one image through a temporary local script or browser without committing fixtures containing credentials. Commit the domain/parser files.

---

### Task 8: Duplicate Detection, Import Persistence, History, and Undo

**Files:**
- Create: `src/lib/import/duplicates.ts`
- Create: `src/lib/import/history.ts`
- Create: `src/lib/import/save.ts`

**Interfaces:**
- Produces: `classifyDuplicates()`, `saveImportDrafts()`, `loadImportHistory()`, and `undoImport()`.
- Consumes: Task 7 drafts, existing encryption, Supabase, and current decrypted cache.

- [ ] **Step 1: Implement duplicate keys**

Normalize with Unicode NFKC, lowercase, trim, and collapse whitespace. Password key uses title/domain/username, note uses title, bank uses title/account last four, and card uses title/card last four. Return advisory match metadata; do not mutate drafts automatically.

- [ ] **Step 2: Define plaintext-free local history**

```ts
export interface ImportHistoryEntry {
  id: string;
  createdAt: string;
  undoUntil: string;
  sourceKind: ImportSource["kind"];
  summary: { total: number; saved: number; failed: number; skipped: number };
  operations: Array<{
    table: "vault_items" | "secure_notes" | "secure_wallet";
    id: string;
    kind: "insert" | "replace";
    encryptedBefore?: { ciphertext: string; iv: string; salt: string };
  }>;
}
```

Use a versioned localStorage key. Retain ten summaries. Remove `operations` after ten minutes. Reject any history object containing draft `fields`.

- [ ] **Step 3: Save deterministically**

`saveImportDrafts()` accepts drafts, masterPassword, userId, progress callback, and connectivity guard. Process sequentially. Encrypt immediately before each Supabase call. For replace, select the current row, serialize the complete pre-update row in memory, encrypt that serialized snapshot with the master key, and store only its ciphertext/IV/salt wrapper in history. Return successes/failures without rolling back unrelated operations.

- [ ] **Step 4: Implement Undo**

`undoImport(entry, masterPassword)` works only within the deadline. Delete inserted rows, decrypt each pre-update wrapper in memory, and restore the row using table/id filters. Process in reverse operation order. Keep failures actionable, clear recovered plaintext objects immediately after use, and do not mark the entry undone until all operations succeed.

- [ ] **Step 5: Verify no plaintext persistence and commit**

Audit `localStorage.setItem` payload construction and browser storage after a local sample import. Confirm no title, username, password, note content, account number, PIN, or parsed fields occur in history. Run build/lint and commit.

---

### Task 9: Magic Import Responsive Workflow UI

**Files:**
- Create: `src/components/import/ImportSourceStep.tsx`
- Create: `src/components/import/ImportReviewStep.tsx`
- Create: `src/components/import/ImportEditor.tsx`
- Create: `src/components/import/ImportProgressStep.tsx`
- Create: `src/components/import/ImportResultsStep.tsx`
- Rewrite: `src/components/GlobalMagicImport.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Tasks 2, 3, 7, and 8.
- Produces: one global importer with explicit `source | analyzing | review | saving | results` phases.

- [ ] **Step 1: Replace ad-hoc phase state with reducer**

Define a discriminated `ImportState` and reducer actions. Illegal transitions return the current state. Keep the existing `GlobalMagicImportProps` signature so `page.tsx` integration does not change.

- [ ] **Step 2: Build source selection**

Offer Paste, CSV, Browser CSV, and Image. Desktop supports drag/drop; mobile file/image inputs use appropriate `accept` and `capture` hints. Preserve selected input on recoverable extraction errors.

- [ ] **Step 3: Build editable review**

Desktop: list/editor split. Mobile: expandable draft cards and nested editor sheet. Support per-item/category include, reveal/hide, confidence only for medium/low, validation issues, and duplicate Skip/Keep Both/Replace.

- [ ] **Step 4: Build save/progress/results**

Use fixed header/body/footer regions. Disable closing while saving unless the user confirms completed records remain. Results show saved/failed/skipped, Retry Failed, Done, and Undo with remaining deadline.

- [ ] **Step 5: Add import history entry point**

Expose “Recent imports” from the source screen. Show ten summaries, Undo only before deadline, and no plaintext item details.

- [ ] **Step 6: Verify all sources and responsive behavior**

Browser verify 390px and 1280px for paste, CSV, browser CSV, image, invalid CSV, duplicate choices, partial failure, retry, close protection, and Undo. Ensure screenshots do not contain user-supplied secrets. Run build/lint and commit.

---

### Task 10: Adopt Adaptive Sheets and Master-Detail Outside Wallet

**Files:**
- Modify: `src/components/PasswordVault.tsx`
- Modify: `src/components/DocumentVault.tsx`
- Modify: `src/components/NotesVault.tsx`
- Modify: `src/components/BankVault.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Task 3 AdaptiveSheet/MasterDetail.
- Produces: consistent desktop list/detail and mobile sheet navigation for four non-Wallet vaults.

- [ ] **Step 1: Migrate create/upload forms to AdaptiveSheet**

Replace `responsive-form-sheet` usage in these four files only. Keep form fields, handlers, encryption, and Supabase writes unchanged. Use fixed mobile footers and inline error regions.

- [ ] **Step 2: Migrate detail presentation**

Desktop uses `MasterDetail`; mobile uses AdaptiveSheet. Preserve selected/focused IDs, copy/favorite/preview/delete actions, and current category grouping.

- [ ] **Step 3: Add instructional empty detail**

Use StateView compact mode with module-specific copy such as “Select a password to view its details.” Do not show it on mobile.

- [ ] **Step 4: Remove conflicting non-Wallet legacy selectors**

Delete only CSS made unreachable by the four migrations. Do not change any Wallet selector or the shared styles currently used by Wallet.

- [ ] **Step 5: Verify each module and commit**

Browser verify list selection, focused search navigation, mobile sheet open/close, form keyboard behavior, and desktop panes for all four modules. Run build/lint, audit Wallet file diff is empty, and commit.

---

### Task 11: Shared Clipboard, Context Actions, and Optimistic Delete with Undo

**Files:**
- Create: `src/hooks/useOptimisticDelete.ts`
- Modify: `src/components/PasswordVault.tsx`
- Modify: `src/components/DocumentVault.tsx`
- Modify: `src/components/NotesVault.tsx`
- Modify: `src/components/BankVault.tsx`

**Interfaces:**
- Consumes: `copySensitiveText`, `ContextActions`, actionable Toast.
- Produces: consistent context menus/long press and six-second deletion Undo.

- [ ] **Step 1: Implement delayed-delete hook**

```ts
export function useOptimisticDelete<T extends { id: string }>(options: {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  commitDelete: (item: T) => Promise<void>;
  toastLabel: (item: T) => string;
}): { scheduleDelete: (item: T) => void; flushPending: () => Promise<void> };
```

Remove immediately, remember original index, show six-second Undo, restore on Undo, and call `commitDelete` only after deadline. Do not flush on unload; server retention is safer than accidental loss.

- [ ] **Step 2: Integrate secure clipboard policy**

Replace direct `navigator.clipboard.writeText` in Passwords, Notes, and Bank Accounts with `copySensitiveText`. Toast whether automatic clearing is scheduled. Do not modify Wallet copy code.

- [ ] **Step 3: Define identical context actions**

For each module, build one action array per item and supply it to right-click, long-press, and explicit More entry points. Preserve module-specific actions and order; Delete is last and destructive.

- [ ] **Step 4: Integrate delayed delete**

Passwords, Notes, Bank: delay database delete. Documents: delay both storage removal and database delete until the deadline. Bulk delete remains confirmed immediate deletion in this phase unless every selected item can be represented in one Undo operation.

- [ ] **Step 5: Verify and commit**

Browser verify right-click, keyboard More, long press without scroll blockage, delete/Undo, expiry commit, and clipboard clearing at 15 seconds. Run build/lint and commit.

---

### Task 12: Consistent Loading, Error, Offline, Skeleton, and Dark Materials

**Files:**
- Modify: `src/components/Skeleton.tsx`
- Modify: `src/components/PasswordVault.tsx`
- Modify: `src/components/DocumentVault.tsx`
- Modify: `src/components/NotesVault.tsx`
- Modify: `src/components/BankVault.tsx`
- Modify: `src/components/settings/Settings.tsx`
- Modify: `src/components/GlobalMagicImport.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Task 2 connectivity/state primitives.
- Produces: truthful state handling and final non-Wallet material polish.

- [ ] **Step 1: Mount one global connectivity banner**

Mount at app-shell level. Add `refreshVersion?: number` to Passwords, Documents, Notes, and Bank Accounts; each refetches when that value increments. In `page.tsx`, increment `refreshVersion` only when connectivity changes from offline to online. Build `nonWalletProps = { masterPassword, focusedItemId, refreshVersion }` for those four modules and retain the existing `sharedProps = { masterPassword, focusedItemId }` for Wallet so Wallet never receives the refresh contract.

- [ ] **Step 2: Replace touched alert/blank states**

Use StateView/Toast for fetch errors, unsupported biometrics, upload/preview errors, extraction failures, and offline mutations. Preserve user-entered forms after retryable failures.

- [ ] **Step 3: Match skeleton geometry**

Add skeleton variants for Settings navigation/detail, master list/detail, and Import review. Match final row heights, panel radii, and desktop/mobile column behavior.

- [ ] **Step 4: Apply scoped dark material layers**

Wrap touched non-Wallet surfaces with `.vault-system-surface`. Use page `#111113`, grouped `#1c1c1e`, elevated `#2c2c2e` in dark mode through scoped variables. Keep existing Wallet colors/selectors unchanged.

- [ ] **Step 5: Audit interaction/reduced-motion states**

Confirm hover, active, focus-visible, disabled, and loading states on every new control. Confirm no transform/spring on reduced motion and no long list stagger.

- [ ] **Step 6: Verify and commit**

Run build/lint and browser-check offline/reconnect, all state variants, light/dark/system, reduced motion, and keyboard navigation. Commit the scoped polish.

---

### Task 13: Final Signed-in Browser QA and Wallet Regression Guard

**Files:**
- Modify only if QA finds a scoped defect: files from Tasks 1-12.
- Do not modify Wallet files.

**Interfaces:**
- Consumes: completed implementation.
- Produces: verified desktop/mobile release candidate.

- [ ] **Step 1: Run clean static verification**

Run:

```bash
PLAN_BASE=$(git log -1 --format=%H -- docs/superpowers/plans/2026-07-13-vault-settings-import-system.md)
git diff --check "$PLAN_BASE"..HEAD
npm run lint
npm run build
git diff --name-only "$PLAN_BASE"..HEAD | rg "WalletVault|PaymentCard|WalletCardDetails|CardLogos" && exit 1 || true
```

Expected: clean checks and no protected Wallet files in the implementation range.

- [ ] **Step 2: Start the local app and sign in interactively**

Use the credentials supplied by the user directly in the browser only. Do not paste them into terminal commands, source, plan updates, browser automation logs, screenshots, or reports. After sign-in, clear sensitive input values before capturing diagnostics.

- [ ] **Step 3: Verify target viewports**

Check mobile 320, 375, 390, and 430; tablet 768 and 1024; desktop 1280 and 1440. Cover Settings root/drill-in, mobile header sheet, Magic Import every phase, four master-detail modules, bottom navigation, safe areas, and no horizontal overflow.

- [ ] **Step 4: Verify accessibility and motion**

Keyboard-only desktop path, visible focus, Escape/Back behavior, focus restoration, screen-reader names, 44px targets, reduced motion, and contrast in Light/Dark/System.

- [ ] **Step 5: Verify security behavior**

Auto-lock, manual lock, biometric enable/disable, clipboard conditional clearing, sign out other devices, encrypted backup export inspection, offline mutation prevention, import history without plaintext, and Undo deadlines.

- [ ] **Step 6: Verify Wallet is unchanged**

Open Wallet on mobile and desktop only as a regression check. Confirm layout, cards, details, dialogs, stacking, and behavior match the approved current implementation. Do not redesign it during QA.

- [ ] **Step 7: Fix scoped defects, re-run checks, and commit**

For each defect, record viewport and reproduction, fix only the owning non-Wallet component, re-run the relevant browser path plus build, and commit:

```bash
git add -p
git commit -m "fix: complete vault system browser polish"
```

If no defect exists, do not create an empty commit.

## Completion Checklist

- [ ] Settings replaces Profile and all approved controls are functional.
- [ ] Mobile overflow exposes Bank Accounts, Settings, Magic Import, Appearance, and Lock Vault.
- [ ] Magic Import supports paste, generic CSV, browser CSV, and image with editable per-item review.
- [ ] Duplicate resolution, validation, partial retry, local history, and ten-minute Undo work.
- [ ] Non-Wallet modules use shared adaptive sheets, master-detail, states, context actions, clipboard policy, and optimistic deletion.
- [ ] Dark materials, skeletons, interaction states, offline truthfulness, and reduced motion are consistent.
- [ ] No credentials or plaintext secrets were persisted in repository artifacts or browser-verification outputs.
- [ ] No protected Wallet file or Wallet-specific selector changed.
- [ ] Lint and production build pass.
