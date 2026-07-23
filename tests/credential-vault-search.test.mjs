import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/components/GlobalSearch.tsx", import.meta.url), "utf8");

test("GlobalSearch queries secure_credentials and maps each row to its own type-specific result", () => {
  assert.match(source, /vault: "passwords" \| "documents" \| "notes" \| "wallet" \| "banks" \| "ssh_key" \| "crypto_wallet" \| "api_credential" \| "wifi_credential" \| "two_factor_backup";/);

  for (const type of ["ssh_key", "crypto_wallet", "api_credential", "wifi_credential", "two_factor_backup"]) {
    assert.match(source, new RegExp(`${type}:\\s*\\{[^}]*icon:[^}]*label:[^}]*color:[^}]*bg:`), `expected a VAULT_META entry for "${type}"`);
  }

  assert.match(source, /supabase\.from\("secure_credentials"\)\.select\("id, title, type"\)\.ilike\("title", pattern\)\.limit\(5\)/);
  assert.match(source, /vault: r\.type as SearchResult\["vault"\]/);
});
