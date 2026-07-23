import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(new URL("../supabase/migrations/20260723150000_secure_credentials.sql", import.meta.url), "utf8");

test("secure_credentials table has the correct columns and type constraint", () => {
  assert.match(sql, /create table public\.secure_credentials/);
  assert.match(sql, /user_id uuid references auth\.users\(id\) on delete cascade not null/);
  assert.match(sql, /title text not null/);
  assert.match(
    sql,
    /type text not null check \(type in \('ssh_key', 'crypto_wallet', 'api_credential', 'wifi_credential', 'two_factor_backup'\)\)/,
  );
  assert.match(sql, /encrypted_content text not null/);
  assert.match(sql, /iv text not null/);
  assert.match(sql, /salt text not null/);
  assert.match(sql, /category text default 'Uncategorized'/);
});

test("secure_credentials has RLS enabled with all four policies scoped to owner + active membership", () => {
  assert.match(sql, /alter table public\.secure_credentials enable row level security/);

  const activeMembership = /exists\s*\(\s*select 1 from public\.app_members member\s+where member\.user_id = \(select auth\.uid\(\)\)\s+and member\.status = 'active'\s*\)/;

  for (const op of ["select", "insert", "update", "delete"]) {
    const re = new RegExp(`create policy "[^"]+"\\s+on public\\.secure_credentials for ${op} to authenticated`, "i");
    assert.match(sql, re, `expected a ${op} policy on secure_credentials`);
  }

  // Ownership + active membership required in every policy body.
  const ownershipCount = (sql.match(/\(select auth\.uid\(\)\)\s*=\s*user_id/g) ?? []).length;
  assert.ok(ownershipCount >= 4, "expected owner-scoping in at least 4 policy clauses (select/insert/using, update/using, update/with check, delete)");
  const membershipCount = (sql.match(activeMembership) ? (sql.match(new RegExp(activeMembership.source, "g")) ?? []).length : 0);
  assert.ok(membershipCount >= 4, "expected the active-membership check in at least 4 policy clauses");
});

test("secure_credentials API grants match the pattern used for the other vault tables", () => {
  assert.match(sql, /revoke all on table\s+public\.secure_credentials\s+from anon, authenticated;/);
  assert.match(sql, /grant select, insert, update, delete on table\s+public\.secure_credentials\s+to authenticated, service_role;/);
});
