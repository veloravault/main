import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("VaultApp registers the five credential tabs in the Vault nav section and mounts CredentialVault", () => {
  const source = read("src/components/VaultApp.tsx");

  assert.match(source, /import \{ CredentialVault \} from "@\/components\/CredentialVault";/);
  assert.match(source, /import \{ CREDENTIAL_TYPE_CONFIGS, type CredentialType \} from "@\/lib\/credentialTypes";/);

  // Tab type includes the credential types via the shared union, not five hand-written literals.
  assert.match(source, /type Tab = "dashboard" \| "passwords" \| "documents" \| "notes" \| "wallet" \| "banks" \| CredentialType \| "profile";/);

  // Nav registration and route mounting both iterate CREDENTIAL_TYPE_CONFIGS - not five copy-pasted blocks.
  assert.match(source, /\.\.\.CREDENTIAL_TYPE_CONFIGS\.map\(/);
  assert.match(source, /<CredentialVault config=\{config\}/);

  // Mobile bottom tab bar excludes the five credential tabs (and banks), same reasoning as the existing banks exclusion.
  assert.match(source, /MOBILE_TAB_BAR_EXCLUDED/);
  assert.match(source, /filter\(item => !MOBILE_TAB_BAR_EXCLUDED\.includes\(item\.tab\)\)/);

  // MobileVaultMenu receives a generic credential-navigation callback.
  assert.match(source, /onNavigateCredential=\{\(type\) => handleNavigate\(type\)\}/);
});

test("MobileVaultMenu lists all five credential types in its more-actions sheet", () => {
  const source = read("src/components/MobileVaultMenu.tsx");
  assert.match(source, /import \{ CREDENTIAL_TYPE_CONFIGS, type CredentialType \} from "@\/lib\/credentialTypes";/);
  assert.match(source, /onNavigateCredential: \(type: CredentialType\) => void;/);
  assert.match(source, /CREDENTIAL_TYPE_CONFIGS\.map\(\(config\) =>/);
  assert.match(source, /onClick=\{\(\) => act\(\(\) => props\.onNavigateCredential\(config\.type\)\)\}/);
});
