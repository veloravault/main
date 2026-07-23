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

test("SecuritySettings renders an entry point for changing the master password", () => {
  const source = read("src/components/settings/SecuritySettings.tsx");
  assert.match(source, /import \{ ChangeMasterPasswordSheet \} from "@\/components\/settings\/ChangeMasterPasswordSheet";/);
  assert.match(source, /<ChangeMasterPasswordSheet open=\{isChangingMasterPassword\} onOpenChange=\{setIsChangingMasterPassword\} \/>/);
});

test("rotate_master_key_ciphertexts v2 migration adds secure_credentials as a fifth table, replacing the old 4-parameter function", () => {
  const sql = read("supabase/migrations/20260723160000_rotate_master_key_ciphertexts_v2.sql");

  // The old 4-parameter overload is dropped outright, not left dangling with stale grants.
  assert.match(sql, /drop function if exists public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb\);/);

  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);

  assert.match(sql, /jsonb_array_length\(p_credentials\)\s*!=\s*v_expected_credentials/);
  assert.match(sql, /update public\.secure_credentials as t/);
  assert.match(sql, /from jsonb_to_recordset\(p_credentials\) as r\(id uuid, encrypted_content text, iv text, salt text\)/);
  assert.match(sql, /where t\.id = r\.id and t\.user_id = auth\.uid\(\);/);

  const diagnosticsCount = (sql.match(/get diagnostics v_updated = row_count/g) ?? []).length;
  assert.equal(diagnosticsCount, 5, "expected one row-count check per table (items, notes, wallet, documents, credentials)");

  assert.match(sql, /revoke all on function public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb, jsonb\) from public, anon, authenticated;/);
  assert.match(sql, /grant execute on function public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb, jsonb\) to authenticated;/);
  assert.doesNotMatch(sql, /grant execute[^;]*to[^;]*anon/);
});

test("masterPasswordRotation now touches secure_credentials as a fifth table, in the same old-then-new password order", () => {
  const source = read("src/lib/masterPasswordRotation.ts");

  assert.match(source, /from\("secure_credentials"\)/);
  assert.match(source, /p_credentials:/);

  // The credentials loop decrypts with the old password and re-encrypts with the new one, same as every other table.
  const credentialsBlockStart = source.indexOf("for (const row of credentials)");
  assert.ok(credentialsBlockStart > -1, "expected a decrypt/re-encrypt loop over `credentials`");
  const credentialsBlock = source.slice(credentialsBlockStart, source.indexOf("onProgress?.({ stage: \"committing\""));
  assert.match(credentialsBlock, /decryptText\([^)]*oldPassword\)/);
  assert.match(credentialsBlock, /encryptText\([^)]*newPassword\)/);

  // The RPC call is still made exactly once, with all five payloads, after every loop.
  const rpcIndex = source.indexOf("supabase.rpc(\"rotate_master_key_ciphertexts\"");
  assert.ok(rpcIndex > credentialsBlockStart, "credentials must be rotated before the rpc commit call");
});
