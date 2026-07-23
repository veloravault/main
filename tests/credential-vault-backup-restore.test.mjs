import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("vaultBackup exports secure_credentials alongside the other four tables", () => {
  const source = read("src/lib/vaultBackup.ts");
  assert.match(source, /counts: Record<"passwords" \| "documents" \| "notes" \| "wallet" \| "credentials", number>;/);
  assert.match(source, /supabase\.from\("secure_credentials"\)\.select\("\*"\)/);
  assert.match(source, /secure_credentials: credentials\.data \?\? \[\]/);
  assert.match(source, /credentials: records\.secure_credentials\.length/);
});

test("vaultRestore re-inserts secure_credentials rows under the current user, with its own progress stage", () => {
  const source = read("src/lib/vaultRestore.ts");
  assert.match(source, /stage: "documents" \| "passwords" \| "notes" \| "wallet" \| "credentials";/);
  assert.match(source, /restored: \{ passwords: number; documents: number; notes: number; wallet: number; credentials: number \};/);
  assert.match(source, /backup\.records\.secure_credentials \?\? \[\]/);
  assert.match(source, /supabase\.from\("secure_credentials"\)\.insert\(\{/);
  assert.match(source, /type: row\.type,/);
  assert.match(source, /restored\.credentials \+= 1/);
});

test("BackupSettings labels the credentials stage and includes it in both summary sentences and cache invalidation", () => {
  const source = read("src/components/settings/BackupSettings.tsx");
  assert.match(source, /credentials: "Credentials",/);
  assert.match(source, /parsedBackup\.manifest\.counts\.credentials/);
  assert.match(source, /restoreResult\.restored\.credentials/);
  for (const type of ["ssh_key", "crypto_wallet", "api_credential", "wifi_credential", "two_factor_backup"]) {
    assert.match(source, new RegExp(`secure_credentials:${type}`));
  }
});
