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
  assert.match(sql, /revoke all on function public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb\) from public, anon;/);
  assert.match(sql, /grant execute on function public\.rotate_master_key_ciphertexts\(jsonb, jsonb, jsonb, jsonb\) to authenticated;/);
  assert.doesNotMatch(sql, /grant execute[^;]*to[^;]*anon/);
});
