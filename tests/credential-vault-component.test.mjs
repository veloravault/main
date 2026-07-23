import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("CredentialVault is generic over config, not hardcoded to one type's fields", () => {
  const source = read("src/components/CredentialVault.tsx");

  assert.match(source, /export function CredentialVault\(\{ config, masterPassword, focusedItemId, refreshVersion/);
  assert.match(source, /import type \{ CredentialTypeConfig, CredentialFieldSchema \} from "@\/lib\/credentialTypes";/);

  // Fetches are filtered by this instance's own type - not every credential row.
  assert.match(source, /from\("secure_credentials"\)/);
  assert.match(source, /\.eq\("type", config\.type\)/);

  // Cache key is namespaced per type, not shared across the five mounted instances.
  assert.match(source, /`secure_credentials:\$\{config\.type\}`/);

  // Insert/update pass config.type and JSON.stringify a dynamic values object,
  // not any one type's named fields (e.g. no literal "privateKey"/"seedPhrase" in the component).
  assert.match(source, /type: config\.type/);
  assert.match(source, /JSON\.stringify\(/);
  assert.doesNotMatch(source, /privateKey|seedPhrase|apiSecret|networkName|walletAddress/);

  // Add/edit forms render fields by mapping over config.fields, not a fixed list.
  assert.match(source, /config\.fields\.map\(/);

  // Encrypt with masterPassword, decrypt with masterPassword (single-key model, unlike rotation).
  assert.match(source, /encryptText\(JSON\.stringify\([^)]*\),\s*masterPassword\)/);
  assert.match(source, /decryptText\([^)]*masterPassword\)/);
});

test("CredentialVault masks only the configured primary field in the detail view, with a reveal toggle", () => {
  const source = read("src/components/CredentialVault.tsx");
  assert.match(source, /field\.key === config\.primaryFieldKey/);
  assert.match(source, /isSecretRevealed/);
  assert.match(source, /EyeIcon/);
  assert.match(source, /EyeOffIcon/);
});

test("CredentialVault supports bulk selection and delete, matching the other vault components", () => {
  const source = read("src/components/CredentialVault.tsx");
  assert.match(source, /useOptimisticDelete/);
  assert.match(source, /SelectionToolbar/);
  assert.match(source, /\.delete\(\)\.in\("id", idsToDelete\)/);
});
