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
