# Master Password Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user change their vault master password from Settings > Security, with every existing encrypted row (passwords, secure notes, wallet/bank records, documents) re-encrypted under the new password, committed atomically.

**Architecture:** The browser decrypts every row with the old password and re-encrypts with the new one (zero-knowledge - the server never sees either password or any plaintext). All new ciphertext is then sent in one call to a `SECURITY DEFINER` Postgres function that updates all four tables inside a single implicit transaction: any failure (including an incomplete payload) rolls back everything, leaving the vault exactly as it was and still readable with the *old* password. Only after that call succeeds does the client discard the old R2 document blobs and clear the local PIN/biometric wrappers (which wrapped the old password).

**Tech Stack:** Next.js App Router, Supabase (Postgres + `supabase-js`), WebCrypto (`crypto.subtle`, already wrapped by `src/lib/crypto.ts`), Cloudflare R2 (via existing `src/lib/r2Client.ts` presigned-URL helpers), Node's built-in test runner (`node --test`, native `.ts` execution - no separate test framework).

## Global Constraints

- The master password is never sent to the server in plaintext, and never compared server-side. All comparison/verification happens client-side against the in-memory `masterKey` from `VaultKeyProvider`.
- The Supabase Auth sign-in password is a completely separate secret and is never touched by this feature.
- Every new Postgres function follows this codebase's established security convention exactly (seen in `resolve_billing_reconciliation_issue`, `list_my_sessions`): `security definer`, `set search_path = ''`, explicit `revoke all ... from public, anon, authenticated` followed by a scoped `grant execute ... to authenticated` (or `service_role` where the caller is server-side - not applicable here, this is called by the signed-in user directly).
- This codebase's test suite (`node --test tests/*.test.mjs`) runs on plain Node with native TypeScript execution - it does **not** understand the `@/` tsconfig path alias used everywhere in `src/`. Any file that imports via `@/...` cannot be directly `import`-ed from a test; it must be tested by reading its source as text and asserting against it (the established pattern for every `@/`-importing file already tested this session, e.g. `PinLock.tsx`, `support-repository.ts`). Only genuinely import-free, dependency-free modules (like the existing `src/lib/vaultKeyOwnership.ts`) can be imported and executed directly in a test.
- `tsc --noEmit`, `node --test tests/*.test.mjs`, and `next build` must all be clean before this is considered done (matches how every change this session has been verified).

---

## File Structure

- **Create** `supabase/migrations/20260723140000_rotate_master_key_ciphertexts.sql` - the atomic Postgres function.
- **Create** `src/lib/chunkKeys.ts` - tiny, dependency-free pure helper (batches an array into bounded-size chunks). Split out specifically so it can be executed and tested directly, unlike everything else in this plan which uses `@/` imports.
- **Create** `src/lib/masterPasswordRotation.ts` - the client-side orchestration: fetch-all, decrypt-all (old password), re-encrypt-all (new password), upload re-encrypted documents to R2, call the RPC, clean up old R2 objects.
- **Create** `src/components/settings/ChangeMasterPasswordSheet.tsx` - the UI: current/new/confirm fields, strength meter, backup reminder, progress state, error state, PIN/biometric-cleared notice.
- **Modify** `src/components/settings/SecuritySettings.tsx` - add a "Master password" section with an action row that opens the new sheet.
- **Create** `tests/master-password-rotation.test.mjs` - all tests for this feature.

---

### Task 1: Atomic rotation function (migration)

**Files:**
- Create: `supabase/migrations/20260723140000_rotate_master_key_ciphertexts.sql`
- Test: `tests/master-password-rotation.test.mjs` (new file, this task adds the first block)

**Interfaces:**
- Produces: a Postgres function `public.rotate_master_key_ciphertexts(p_items jsonb, p_notes jsonb, p_wallet jsonb, p_documents jsonb) returns void`, callable via `supabase.rpc("rotate_master_key_ciphertexts", { p_items, p_notes, p_wallet, p_documents })`. On success, all four tables are updated. On any problem it raises an exception with `errcode = 'P0001'` (payload row count doesn't match what exists for this user) or `errcode = 'P0002'` (an update didn't affect the expected number of rows - a row id didn't actually belong to this user). Task 3 consumes these exact error codes.

- [ ] **Step 1: Write the failing test**

Create `tests/master-password-rotation.test.mjs` with this first block:

```javascript
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("rotate_master_key_ciphertexts migration is atomic and properly scoped", () => {
  const sql = read("supabase/migrations/20260723140000_rotate_master_key_ciphertexts.sql");

  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);

  // Completeness check: refuses a payload missing rows, before touching anything.
  assert.match(sql, /ROTATION_PAYLOAD_INCOMPLETE/);
  assert.match(sql, /jsonb_array_length\(p_items\)\s*!=\s*v_expected_items/);
  assert.match(sql, /jsonb_array_length\(p_notes\)\s*!=\s*v_expected_notes/);
  assert.match(sql, /jsonb_array_length\(p_wallet\)\s*!=\s*v_expected_wallet/);
  assert.match(sql, /jsonb_array_length\(p_documents\)\s*!=\s*v_expected_documents/);

  // Per-update row-count verification: a forged/foreign id can't silently no-op.
  assert.match(sql, /ROTATION_PAYLOAD_MISMATCH/);
  const diagnosticsCount = (sql.match(/get diagnostics v_updated = row_count/g) ?? []).length;
  assert.equal(diagnosticsCount, 4, "expected one row-count check per table (items, notes, wallet, documents)");

  // Every update scoped by both id and user_id - no cross-user write possible.
  const scopedUpdates = (sql.match(/t\.id = r\.id and t\.user_id = auth\.uid\(\)/g) ?? []).length;
  assert.equal(scopedUpdates, 4, "expected all four updates scoped by id AND user_id");

  // All four tables actually touched.
  assert.match(sql, /update public\.vault_items as t/);
  assert.match(sql, /update public\.secure_notes as t/);
  assert.match(sql, /update public\.secure_wallet as t/);
  assert.match(sql, /update public\.vault_documents as t/);

  // Grants: authenticated only, never anon/public.
  assert.match(sql, /revoke all on function public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb\) from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb\) to authenticated;/);
  assert.doesNotMatch(sql, /grant execute[^;]*to[^;]*anon/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: FAIL - `ENOENT: no such file or directory` reading the migration (it doesn't exist yet).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260723140000_rotate_master_key_ciphertexts.sql`:

```sql
-- Changing the master password means every encrypted row across four
-- tables must be decrypted (old password) and re-encrypted (new password)
-- client-side, since this is zero-knowledge - the server never sees either
-- password or any plaintext. This function is where that re-encrypted
-- ciphertext actually gets committed, and it has to be all-or-nothing:
-- a client-only sequence of per-row updates could be interrupted halfway,
-- leaving some rows on the old password and some on the new one with no
-- way to tell which. A single plpgsql function gives us one implicit
-- transaction for free - any raised exception rolls back everything.
--
-- Two failure modes are guarded against explicitly:
--   1. The payload is missing rows entirely (a client bug) - checked by
--      comparing array lengths against a fresh count for this user BEFORE
--      touching anything.
--   2. The payload names an id that doesn't actually belong to this user
--      (forged or stale) - an UPDATE scoped by user_id would just silently
--      match fewer rows than expected, so each UPDATE's row count is
--      checked against the expected count immediately after.

create or replace function public.rotate_master_key_ciphertexts(
  p_items jsonb,
  p_notes jsonb,
  p_wallet jsonb,
  p_documents jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_items int;
  v_expected_notes int;
  v_expected_wallet int;
  v_expected_documents int;
  v_updated int;
begin
  select count(*) into v_expected_items from public.vault_items where user_id = auth.uid();
  select count(*) into v_expected_notes from public.secure_notes where user_id = auth.uid();
  select count(*) into v_expected_wallet from public.secure_wallet where user_id = auth.uid();
  select count(*) into v_expected_documents from public.vault_documents where user_id = auth.uid();

  if jsonb_array_length(p_items) != v_expected_items
    or jsonb_array_length(p_notes) != v_expected_notes
    or jsonb_array_length(p_wallet) != v_expected_wallet
    or jsonb_array_length(p_documents) != v_expected_documents
  then
    raise exception 'ROTATION_PAYLOAD_INCOMPLETE' using errcode = 'P0001';
  end if;

  update public.vault_items as t
  set encrypted_data = r.encrypted_data, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_items) as r(id uuid, encrypted_data text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_items then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;

  update public.secure_notes as t
  set encrypted_content = r.encrypted_content, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_notes) as r(id uuid, encrypted_content text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_notes then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;

  update public.secure_wallet as t
  set encrypted_content = r.encrypted_content, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_wallet) as r(id uuid, encrypted_content text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_wallet then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;

  update public.vault_documents as t
  set storage_path = r.storage_path, iv = r.iv, salt = r.salt, updated_at = now()
  from jsonb_to_recordset(p_documents) as r(id uuid, storage_path text, iv text, salt text)
  where t.id = r.id and t.user_id = auth.uid();
  get diagnostics v_updated = row_count;
  if v_updated != v_expected_documents then
    raise exception 'ROTATION_PAYLOAD_MISMATCH' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.rotate_master_key_ciphertexts(jsonb, jsonb, jsonb, jsonb) to authenticated;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260723140000_rotate_master_key_ciphertexts.sql tests/master-password-rotation.test.mjs
git commit -m "feat: add atomic rotate_master_key_ciphertexts migration"
```

Do **not** run `supabase db push` yet - the plan pushes it once, after Task 3's client code is also in place, to avoid pushing a migration whose only caller doesn't exist yet. Ask the user before pushing, same as every other migration this session.

---

### Task 2: `chunkKeys` pure helper

**Files:**
- Create: `src/lib/chunkKeys.ts`
- Test: `tests/master-password-rotation.test.mjs` (append to the file from Task 1)

**Interfaces:**
- Produces: `chunkKeys<T>(values: T[], size?: number): T[][]` (default `size` is 1000). Task 3 consumes this to keep each `/api/storage/delete` call within that route's existing 1000-key-per-request limit (`MAX_KEYS = 1_000` in `src/app/api/storage/delete/route.ts`).

- [ ] **Step 1: Write the failing test**

Append to `tests/master-password-rotation.test.mjs`:

```javascript
import { chunkKeys } from "../src/lib/chunkKeys.ts";

test("chunkKeys batches values into bounded groups, including exact multiples and remainders", () => {
  assert.deepEqual(chunkKeys([], 2), []);
  assert.deepEqual(chunkKeys(["a", "b", "c"], 2), [["a", "b"], ["c"]]);
  assert.deepEqual(chunkKeys(["a", "b", "c", "d"], 2), [["a", "b"], ["c", "d"]]);
  assert.deepEqual(chunkKeys([1, 2, 3], 10), [[1, 2, 3]]);

  const oneThousandOne = Array.from({ length: 1001 }, (_, i) => `key-${i}`);
  const defaultChunks = chunkKeys(oneThousandOne);
  assert.equal(defaultChunks.length, 2);
  assert.equal(defaultChunks[0].length, 1000);
  assert.equal(defaultChunks[1].length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: FAIL - `ERR_MODULE_NOT_FOUND` for `../src/lib/chunkKeys.ts` (it doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/chunkKeys.ts`:

```typescript
/** Splits `values` into chunks of at most `size` items each. No imports -
 *  kept dependency-free so it can be tested directly, unlike the rest of
 *  this codebase's src/lib files which use the @/ path alias. */
export function chunkKeys<T>(values: T[], size = 1000): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/chunkKeys.ts tests/master-password-rotation.test.mjs
git commit -m "feat: add chunkKeys helper for bounded storage-delete batches"
```

---

### Task 3: Client-side rotation orchestration

**Files:**
- Create: `src/lib/masterPasswordRotation.ts`
- Test: `tests/master-password-rotation.test.mjs` (append)

**Interfaces:**
- Consumes: `chunkKeys` from `./chunkKeys` (Task 2); `encryptText`, `decryptText`, `encryptFile`, `decryptFile` from `./crypto` (already exist, signatures unchanged); `requestDownloadUrl`, `downloadFromPresignedUrl`, `requestUploadUrl`, `uploadToPresignedUrl`, `deleteObjects` from `./r2Client` (already exist); `supabase` from `./supabase` (already exists).
- Produces: `export class MasterPasswordRotationError extends Error {}`; `export type RotationStage = "items" | "notes" | "wallet" | "documents" | "committing" | "cleanup"`; `export interface RotationProgress { stage: RotationStage; completed: number; total: number; }`; `export async function rotateMasterPassword(oldPassword: string, newPassword: string, onProgress?: (progress: RotationProgress) => void): Promise<void>`. Task 4 consumes all of these exact names.

- [ ] **Step 1: Write the failing test**

Append to `tests/master-password-rotation.test.mjs`:

```javascript
test("masterPasswordRotation touches all four tables, in old-then-new password order, and only cleans up after the RPC commits", () => {
  const source = read("src/lib/masterPasswordRotation.ts");

  // Fetches all four tables before doing anything else.
  assert.match(source, /from\("vault_items"\)/);
  assert.match(source, /from\("secure_notes"\)/);
  assert.match(source, /from\("secure_wallet"\)/);
  assert.match(source, /from\("vault_documents"\)/);

  // Decrypts with the OLD password, re-encrypts with the NEW one - not the reverse.
  assert.match(source, /decryptText\([^)]*oldPassword\)/);
  assert.match(source, /encryptText\([^)]*newPassword\)/);
  assert.match(source, /decryptFile\([^)]*oldPassword\)/);
  assert.match(source, /encryptFile\([^)]*newPassword\)/);

  // Calls the exact RPC from Task 1, with all four payload keys.
  assert.match(source, /supabase\.rpc\("rotate_master_key_ciphertexts",/);
  assert.match(source, /p_items:/);
  assert.match(source, /p_notes:/);
  assert.match(source, /p_wallet:/);
  assert.match(source, /p_documents:/);

  // Old R2 document objects are only deleted AFTER the rpc call in source
  // order, and via the bounded chunkKeys helper, not a single unbounded call.
  const rpcIndex = source.indexOf("supabase.rpc(\"rotate_master_key_ciphertexts\"");
  const cleanupIndex = source.indexOf("deleteObjects(");
  assert.ok(rpcIndex > -1 && cleanupIndex > -1 && cleanupIndex > rpcIndex, "cleanup must happen after the rpc call, in source order");
  assert.match(source, /chunkKeys\(oldDocumentKeys\)/);

  // Error codes checked by code, not by matching message text (matches the
  // established pattern from resolveBillingReconciliationIssueAdmin).
  assert.match(source, /rpcError\.code === "P0001"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: FAIL - `ENOENT` reading `src/lib/masterPasswordRotation.ts` (it doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/masterPasswordRotation.ts`:

```typescript
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText, encryptFile, decryptFile } from "@/lib/crypto";
import { requestDownloadUrl, downloadFromPresignedUrl, requestUploadUrl, uploadToPresignedUrl, deleteObjects } from "@/lib/r2Client";
import { chunkKeys } from "@/lib/chunkKeys";

export type RotationStage = "items" | "notes" | "wallet" | "documents" | "committing" | "cleanup";

export interface RotationProgress {
  stage: RotationStage;
  completed: number;
  total: number;
}

export class MasterPasswordRotationError extends Error {}

type ItemRow = { id: string; encrypted_data: string; iv: string; salt: string };
type NoteRow = { id: string; encrypted_content: string; iv: string; salt: string };
type WalletRow = { id: string; encrypted_content: string; iv: string; salt: string };
type DocumentRow = { id: string; storage_path: string; iv: string; salt: string };

/**
 * Re-encrypts the entire vault (passwords, notes, wallet/bank, documents)
 * under `newPassword` and commits it via a single atomic Postgres function.
 * Nothing is written to the database until every row has been successfully
 * decrypted and re-encrypted in memory - if any decrypt/encrypt/upload step
 * throws, the function throws before the rpc call and nothing changes.
 */
export async function rotateMasterPassword(
  oldPassword: string,
  newPassword: string,
  onProgress?: (progress: RotationProgress) => void,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new MasterPasswordRotationError("Sign in again before changing your master key.");

  const [itemsRes, notesRes, walletRes, documentsRes] = await Promise.all([
    supabase.from("vault_items").select("id,encrypted_data,iv,salt"),
    supabase.from("secure_notes").select("id,encrypted_content,iv,salt"),
    supabase.from("secure_wallet").select("id,encrypted_content,iv,salt"),
    supabase.from("vault_documents").select("id,storage_path,iv,salt"),
  ]);
  if (itemsRes.error || notesRes.error || walletRes.error || documentsRes.error) {
    throw new MasterPasswordRotationError("Could not read your vault. Nothing was changed.");
  }

  const items = (itemsRes.data ?? []) as ItemRow[];
  const notes = (notesRes.data ?? []) as NoteRow[];
  const wallet = (walletRes.data ?? []) as WalletRow[];
  const documents = (documentsRes.data ?? []) as DocumentRow[];
  const totalRows = items.length + notes.length + wallet.length + documents.length;
  let completed = 0;

  const rotatedItems = [];
  for (const row of items) {
    const plaintext = await decryptText(row.encrypted_data, row.salt, row.iv, oldPassword);
    const encrypted = await encryptText(plaintext, newPassword);
    rotatedItems.push({ id: row.id, encrypted_data: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt });
    completed += 1;
    onProgress?.({ stage: "items", completed, total: totalRows });
  }

  const rotatedNotes = [];
  for (const row of notes) {
    const plaintext = await decryptText(row.encrypted_content, row.salt, row.iv, oldPassword);
    const encrypted = await encryptText(plaintext, newPassword);
    rotatedNotes.push({ id: row.id, encrypted_content: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt });
    completed += 1;
    onProgress?.({ stage: "notes", completed, total: totalRows });
  }

  const rotatedWallet = [];
  for (const row of wallet) {
    const plaintext = await decryptText(row.encrypted_content, row.salt, row.iv, oldPassword);
    const encrypted = await encryptText(plaintext, newPassword);
    rotatedWallet.push({ id: row.id, encrypted_content: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt });
    completed += 1;
    onProgress?.({ stage: "wallet", completed, total: totalRows });
  }

  const rotatedDocuments = [];
  const oldDocumentKeys: string[] = [];
  for (const row of documents) {
    const downloadUrl = await requestDownloadUrl(row.storage_path);
    const encryptedBuffer = await downloadFromPresignedUrl(downloadUrl);
    const plainBuffer = await decryptFile(encryptedBuffer, row.salt, row.iv, oldPassword);
    const reEncrypted = await encryptFile(plainBuffer, newPassword);
    const { url, key } = await requestUploadUrl(reEncrypted.ciphertextBuffer.byteLength);
    await uploadToPresignedUrl(url, reEncrypted.ciphertextBuffer);
    rotatedDocuments.push({ id: row.id, storage_path: key, iv: reEncrypted.iv, salt: reEncrypted.salt });
    oldDocumentKeys.push(row.storage_path);
    completed += 1;
    onProgress?.({ stage: "documents", completed, total: totalRows });
  }

  onProgress?.({ stage: "committing", completed: totalRows, total: totalRows });
  const { error: rpcError } = await supabase.rpc("rotate_master_key_ciphertexts", {
    p_items: rotatedItems,
    p_notes: rotatedNotes,
    p_wallet: rotatedWallet,
    p_documents: rotatedDocuments,
  });
  if (rpcError) {
    if (rpcError.code === "P0001") {
      throw new MasterPasswordRotationError("Your vault changed while this was running. Nothing was changed - try again.");
    }
    throw new MasterPasswordRotationError("The change could not be saved. Nothing was changed.");
  }

  onProgress?.({ stage: "cleanup", completed: totalRows, total: totalRows });
  for (const chunk of chunkKeys(oldDocumentKeys)) {
    try {
      await deleteObjects(chunk);
    } catch {
      // Best-effort: the rotation itself already succeeded. A leftover old
      // R2 object is harmless (nothing in the DB points at it anymore).
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the project's own type checker**

Run: `npx tsc --noEmit`
Expected: no errors. (This file is real TypeScript imported by real components later, so it must type-check even though the test above only reads it as text.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/masterPasswordRotation.ts tests/master-password-rotation.test.mjs
git commit -m "feat: add client-side master password rotation orchestration"
```

---

### Task 4: Change Master Password sheet (UI)

**Files:**
- Create: `src/components/settings/ChangeMasterPasswordSheet.tsx`
- Test: `tests/master-password-rotation.test.mjs` (append)

**Interfaces:**
- Consumes: `rotateMasterPassword`, `MasterPasswordRotationError`, `RotationProgress` from `@/lib/masterPasswordRotation` (Task 3); `useVaultKey` from `@/components/auth/VaultKeyProvider` (existing: `{ masterKey, authenticatedUserId, setMasterKey }`); `getStrength` from `@/lib/passwordHealth` (existing); `PasswordStrengthMeter` from `@/components/auth/PasswordStrengthMeter` (existing, props `{ strength: StrengthResult }`); `clearPinLock`, `hasPinLock` from `@/components/PinLock` (existing); `disableBiometrics`, `hasBiometricsEnabled` from `@/lib/biometrics` (existing); `useToast` from `@/components/Toast` (existing); `AdaptiveSheet`, `AdaptiveSheetBody`, `AdaptiveSheetFooter` from `@/components/ui/adaptive-sheet` (existing); `Button` from `@/components/ui/button` (existing); `.account-field-label`/`.account-field-input`/`.full-width` CSS classes (already added to `globals.css` earlier this session).
- Produces: `export function ChangeMasterPasswordSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void })`. Task 5 consumes this exact export and prop names.

- [ ] **Step 1: Write the failing test**

Append to `tests/master-password-rotation.test.mjs`:

```javascript
test("ChangeMasterPasswordSheet verifies the current password locally, and only clears PIN/biometrics and updates the in-memory key after rotation succeeds", () => {
  const source = read("src/components/settings/ChangeMasterPasswordSheet.tsx");

  assert.match(source, /export function ChangeMasterPasswordSheet\(\{ open, onOpenChange \}/);

  // Current-password re-entry is checked against the already-trusted
  // in-memory masterKey - no separate decrypt-based verification needed.
  assert.match(source, /currentPassword !== masterKey/);

  // rotateMasterPassword is awaited before any local state is cleared/updated.
  const rotateIndex = source.indexOf("await rotateMasterPassword(");
  const clearPinIndex = source.indexOf("clearPinLock()");
  const disableBioIndex = source.indexOf("disableBiometrics(");
  const setMasterKeyIndex = source.indexOf("setMasterKey(newPassword");
  assert.ok(rotateIndex > -1, "must call rotateMasterPassword");
  assert.ok(clearPinIndex > rotateIndex, "PIN must only be cleared after rotation");
  assert.ok(disableBioIndex > rotateIndex, "biometrics must only be disabled after rotation");
  assert.ok(setMasterKeyIndex > rotateIndex, "in-memory master key must only update after rotation");

  // Errors from rotation are caught and surfaced, not left to crash the form.
  assert.match(source, /catch \(err\)/);
  assert.match(source, /MasterPasswordRotationError/);

  // Double-submit guard while a rotation is in flight.
  assert.match(source, /if \(isRotating\) return;/);

  // Cancel must reset the form, not just close it - otherwise stale
  // password material can persist in state until the sheet reopens.
  assert.match(source, /onClick=\{\(\) => \{ onOpenChange\(false\); reset\(\); \}\}/);

  // noValidate disables the browser's own minLength enforcement, so an
  // explicit length check is required in code, not just the strength meter.
  assert.match(source, /newPassword\.length < 8/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: FAIL - `ENOENT` reading `src/components/settings/ChangeMasterPasswordSheet.tsx` (it doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/components/settings/ChangeMasterPasswordSheet.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Loader2Icon, XCircleIcon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { Button } from "@/components/ui/button";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { getStrength } from "@/lib/passwordHealth";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { clearPinLock, hasPinLock } from "@/components/PinLock";
import { disableBiometrics, hasBiometricsEnabled } from "@/lib/biometrics";
import { rotateMasterPassword, MasterPasswordRotationError, type RotationProgress } from "@/lib/masterPasswordRotation";
import { useToast } from "@/components/Toast";

function stageLabel(stage: RotationProgress["stage"]): string {
  if (stage === "items") return "Re-encrypting passwords";
  if (stage === "notes") return "Re-encrypting secure notes";
  if (stage === "wallet") return "Re-encrypting wallet & bank records";
  if (stage === "documents") return "Re-encrypting documents";
  if (stage === "committing") return "Saving changes";
  return "Cleaning up";
}

export function ChangeMasterPasswordSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { masterKey, authenticatedUserId, setMasterKey } = useVaultKey();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<RotationProgress | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const strength = getStrength(newPassword);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRotating) return;
    setError(null);

    if (currentPassword !== masterKey) {
      setError("That's not your current master key.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Your new master key must be at least 8 characters long.");
      return;
    }
    if (strength.level === "weak") {
      setError("Choose a stronger master key - it's the only thing protecting your vault.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new master key confirmation does not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a master key different from your current one.");
      return;
    }
    if (!authenticatedUserId) {
      setError("Your authenticated account could not be verified.");
      return;
    }

    setIsRotating(true);
    try {
      await rotateMasterPassword(currentPassword, newPassword, setProgress);
    } catch (err) {
      setError(err instanceof MasterPasswordRotationError ? err.message : "The change could not be completed. Nothing was changed.");
      setIsRotating(false);
      return;
    }

    // The vault is now re-encrypted with the new password server-side -
    // everything below is local, best-effort cleanup. A failure here must
    // never be reported as "nothing was changed."
    try {
      if (hasPinLock(authenticatedUserId)) clearPinLock();
      if (hasBiometricsEnabled(authenticatedUserId)) disableBiometrics(authenticatedUserId);
    } catch {
      // Best-effort - stale PIN/biometric wrappers will just fail to unlock
      // next time, and the user can redo setup from Settings.
    }

    const committed = setMasterKey(newPassword, authenticatedUserId);
    setIsRotating(false);
    reset();
    onOpenChange(false);

    if (!committed) {
      toast("Master key changed, but your session changed during the process - sign in again to continue.", "error");
      return;
    }
    toast("Master key changed. PIN and Face ID / Touch ID were turned off - set them up again from Settings if you'd like.", "success");
  };

  return (
    <AdaptiveSheet
      open={open}
      onOpenChange={(next) => { if (!isRotating) { onOpenChange(next); if (!next) reset(); } }}
      title="Change master password"
      description="Re-encrypts your entire vault with a new master key."
      size="sm"
    >
      <form onSubmit={handleSubmit} noValidate>
        <AdaptiveSheetBody className="space-y-4">
          <p className="text-[13px] text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2">
            Consider exporting a backup first, from Data &amp; Backup, in case anything interrupts this.
          </p>
          <div>
            <label htmlFor="rotate-current" className="account-field-label">Current master password</label>
            <input id="rotate-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="account-field-input full-width" disabled={isRotating} required />
          </div>
          <div>
            <label htmlFor="rotate-new" className="account-field-label">New master password</label>
            <input id="rotate-new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="account-field-input full-width" disabled={isRotating} required minLength={8} />
            {newPassword && <PasswordStrengthMeter strength={strength} />}
          </div>
          <div>
            <label htmlFor="rotate-confirm" className="account-field-label">Confirm new master password</label>
            <input id="rotate-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="account-field-input full-width" disabled={isRotating} required />
          </div>
          {progress && (
            <p className="text-[13px] text-muted-foreground flex items-center gap-2">
              <Loader2Icon className="w-4 h-4 animate-spin" aria-hidden="true" />
              {stageLabel(progress.stage)} ({progress.completed}/{progress.total})
            </p>
          )}
          {error && (
            <p className="text-[13px] text-destructive flex items-center gap-2" role="alert">
              <XCircleIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
        </AdaptiveSheetBody>
        <AdaptiveSheetFooter>
          <Button type="button" variant="ghost" onClick={() => { onOpenChange(false); reset(); }} disabled={isRotating}>Cancel</Button>
          <Button type="submit" className="import-primary-action" disabled={isRotating}>
            {isRotating ? "Changing…" : "Change master password"}
          </Button>
        </AdaptiveSheetFooter>
      </form>
    </AdaptiveSheet>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the project's own type checker**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/ChangeMasterPasswordSheet.tsx tests/master-password-rotation.test.mjs
git commit -m "feat: add Change Master Password sheet UI"
```

---

### Task 5: Wire into Settings > Security

**Files:**
- Modify: `src/components/settings/SecuritySettings.tsx`
- Test: `tests/master-password-rotation.test.mjs` (append)

**Interfaces:**
- Consumes: `ChangeMasterPasswordSheet` from `@/components/settings/ChangeMasterPasswordSheet` (Task 4, exact export/props already fixed).

- [ ] **Step 1: Write the failing test**

Append to `tests/master-password-rotation.test.mjs`:

```javascript
test("SecuritySettings renders an entry point for changing the master password", () => {
  const source = read("src/components/settings/SecuritySettings.tsx");
  assert.match(source, /import \{ ChangeMasterPasswordSheet \} from "@\/components\/settings\/ChangeMasterPasswordSheet";/);
  assert.match(source, /<ChangeMasterPasswordSheet open=\{isChangingMasterPassword\} onOpenChange=\{setIsChangingMasterPassword\} \/>/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: FAIL - neither the import nor the JSX exist in `SecuritySettings.tsx` yet.

- [ ] **Step 3: Add the entry point**

In `src/components/settings/SecuritySettings.tsx`, add the import alongside the other local imports near the top:

```typescript
import { ChangeMasterPasswordSheet } from "@/components/settings/ChangeMasterPasswordSheet";
```

Add state next to the other `useState` calls in the component body:

```typescript
const [isChangingMasterPassword, setIsChangingMasterPassword] = useState(false);
```

Add a new section between the existing `apple-grouped-list` (Auto-lock/Face ID/PIN/Clipboard) and the `Sessions` section label:

```tsx
<div className="settings-section-label">Master password</div>
<div className="settings-group">
  <button type="button" className="settings-action-row system-interactive" onClick={() => setIsChangingMasterPassword(true)}>
    <LockIcon aria-hidden="true" />
    <span><strong>Change master password</strong><small>Re-encrypts your entire vault with a new key.</small></span>
  </button>
</div>
```

Add the sheet itself right before the closing `</section>` (alongside the existing PIN-setup `<AdaptiveSheet>`):

```tsx
<ChangeMasterPasswordSheet open={isChangingMasterPassword} onOpenChange={setIsChangingMasterPassword} />
```

`LockIcon` is already imported in this file (used by the existing "Lock Vault" row) - no new icon import needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/master-password-rotation.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/SecuritySettings.tsx tests/master-password-rotation.test.mjs
git commit -m "feat: wire Change Master Password into Settings > Security"
```

---

### Task 6: Full verification and migration push

**Files:** none created - this is a verification-only task.

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Run the full test suite**

Run: `node --test tests/*.test.mjs`
Expected: every test passes, including the 5 new ones from this feature (total count will be whatever the suite was at before plus 5).

- [ ] **Step 3: Run a production build**

Run: `npx next build`
Expected: exit code 0, no errors.

- [ ] **Step 4: Ask the user before pushing the migration**

`supabase db push` modifies the live production database - confirm with the user before running it (same as every other migration this session), since `rotate_master_key_ciphertexts` won't exist server-side until it's pushed, and the feature is non-functional (RPC call fails with "function not found") until then.

- [ ] **Step 5: Verify the function exists post-push**

After the user approves and the push completes, sanity-check the function is live and correctly scoped to `authenticated` (not `anon`) with an unauthenticated request:

```bash
curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/rotate_master_key_ciphertexts" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"p_items":[],"p_notes":[],"p_wallet":[],"p_documents":[]}'
```

Expected: `{"code":"42501","details":null,"hint":null,"message":"permission denied for function rotate_master_key_ciphertexts"}` - matching the exact verification pattern already used for `list_my_sessions` and `resolve_billing_reconciliation_issue` earlier this session.

---

## Self-Review

**Spec coverage:** every section of the design doc maps to a task - atomic commit (Task 1), bounded document cleanup (Task 2), full re-encryption flow with progress (Task 3), UI with current-password check/strength meter/backup reminder/PIN-biometric-clear-on-success (Task 4), Settings entry point (Task 5), and the same tsc/test/build/push verification ritual used all session (Task 6). The one explicit deviation from the spec: "current password verification" simplified from "decrypt one real item" to a direct comparison against the already-trusted in-memory `masterKey` - simpler, avoids an edge case where a brand-new vault has zero items to decrypt against, and is not a change in security properties since `masterKey` in context is already the real, working master password for this session.

**Placeholder scan:** no "TBD"/"implement later"/"add validation" style gaps - every step has complete, real code (SQL, TypeScript, and test assertions).

**Type consistency:** `RotationProgress`/`RotationStage`/`MasterPasswordRotationError`/`rotateMasterPassword` names and shapes are identical between Task 3 (producer) and Task 4 (consumer). `ChangeMasterPasswordSheet`'s `{ open, onOpenChange }` props are identical between Task 4 (producer) and Task 5 (consumer). The RPC name `rotate_master_key_ciphertexts` and its four `p_*` parameter names are identical between Task 1 (SQL) and Task 3 (client call).
