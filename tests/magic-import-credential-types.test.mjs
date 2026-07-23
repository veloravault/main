import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { validateDraft } from "../src/lib/import/validation.ts";
import { classifyDuplicates } from "../src/lib/import/duplicates.ts";

const NEW_TYPES = ["ssh_key", "crypto_wallet", "api_credential", "wifi_credential", "two_factor_backup"];

function draft(type, title, fields) {
  return { clientId: `${type}-${title}`, type, title, fields, confidence: {}, included: true, sourceLabel: "test", issues: [], duplicate: null, duplicateResolution: "unresolved" };
}

test("validateDraft requires the essential secret field for each of the 5 new credential types", () => {
  assert.deepEqual(validateDraft(draft("ssh_key", "GitHub", {})), ["Add privateKey."]);
  assert.deepEqual(validateDraft(draft("ssh_key", "GitHub", { privateKey: "-----BEGIN..." })), []);

  assert.deepEqual(validateDraft(draft("crypto_wallet", "Ledger", {})), ["Add seedPhrase."]);
  assert.deepEqual(validateDraft(draft("crypto_wallet", "Ledger", { seedPhrase: "abandon abandon..." })), []);

  assert.deepEqual(validateDraft(draft("api_credential", "Stripe", {})), ["Add apiKey."]);
  assert.deepEqual(validateDraft(draft("api_credential", "Stripe", { apiKey: "pk_live_..." })), []);

  assert.deepEqual(validateDraft(draft("wifi_credential", "Home-5G", {})), ["Add networkName.", "Add password."]);
  assert.deepEqual(validateDraft(draft("wifi_credential", "Home-5G", { networkName: "Home-5G", password: "hunter2" })), []);

  assert.deepEqual(validateDraft(draft("two_factor_backup", "GitHub 2FA", {})), ["Add codes."]);
  assert.deepEqual(validateDraft(draft("two_factor_backup", "GitHub 2FA", { codes: "1111-2222" })), []);
});

test("classifyDuplicates does not collide two different same-titled items of a new credential type", () => {
  const existing = [
    { id: "existing-1", type: "ssh_key", title: "Server Key", fields: { host: "prod.example.com" } },
  ];
  const drafts = [
    draft("ssh_key", "Server Key", { host: "staging.example.com" }), // same title, different host -> NOT a duplicate
    draft("ssh_key", "Server Key", { host: "prod.example.com" }), // same title AND host -> duplicate
  ];
  const [distinctHost, sameHost] = classifyDuplicates(drafts, existing);
  assert.equal(distinctHost.duplicate, null, "different host must not be flagged as a duplicate of the existing key");
  assert.equal(sameHost.duplicate?.matchId, "existing-1");
});

test("classifyDuplicates keys crypto wallets, API credentials, WiFi and 2FA by their own distinguishing field, not by card number", () => {
  const existing = [
    { id: "wallet-1", type: "crypto_wallet", title: "Cold Wallet", fields: { walletAddress: "0xabc" } },
    { id: "api-1", type: "api_credential", title: "Prod", fields: { serviceName: "Stripe", apiKey: "pk_1" } },
    { id: "wifi-1", type: "wifi_credential", title: "Router", fields: { networkName: "Home-5G" } },
    { id: "twofa-1", type: "two_factor_backup", title: "Backup Codes", fields: { serviceName: "GitHub" } },
  ];
  const drafts = [
    draft("crypto_wallet", "Cold Wallet", { walletAddress: "0xdef" }),
    draft("api_credential", "Prod", { serviceName: "Stripe", apiKey: "pk_2" }),
    draft("wifi_credential", "Router", { networkName: "Office-5G" }),
    draft("two_factor_backup", "Backup Codes", { serviceName: "GitLab" }),
  ];
  const results = classifyDuplicates(drafts, existing);
  for (const result of results) assert.equal(result.duplicate, null, `${result.type} with a different distinguishing field must not match`);
});

const typesSource = readFileSync(new URL("../src/lib/import/types.ts", import.meta.url), "utf8");
const normalizeSource = readFileSync(new URL("../src/lib/import/normalize.ts", import.meta.url), "utf8");
const saveSource = readFileSync(new URL("../src/lib/import/save.ts", import.meta.url), "utf8");
const historySource = readFileSync(new URL("../src/lib/import/history.ts", import.meta.url), "utf8");
const globalImportSource = readFileSync(new URL("../src/components/GlobalMagicImport.tsx", import.meta.url), "utf8");
const reviewStepSource = readFileSync(new URL("../src/components/import/ImportReviewStep.tsx", import.meta.url), "utf8");
const editorSource = readFileSync(new URL("../src/components/import/ImportEditor.tsx", import.meta.url), "utf8");
const actionsSource = readFileSync(new URL("../src/app/actions.ts", import.meta.url), "utf8");
const scanRouteSource = readFileSync(new URL("../src/app/api/scan/route.ts", import.meta.url), "utf8");

test("ImportItemType and GlobalImportResult cover all 5 new credential types", () => {
  assert.match(typesSource, /ImportItemType = "password" \| "note" \| "bank_account" \| "card" \| CredentialType/);
  for (const key of ["ssh_keys", "crypto_wallets", "api_credentials", "wifi_credentials", "two_factor_backups"]) {
    assert.match(typesSource, new RegExp(`${key}: Global`), `GlobalImportResult must declare "${key}"`);
  }
});

test("normalizeImportResult maps every new result array to a draft, and isGlobalImportResult validates all 9 arrays", () => {
  for (const key of ["ssh_keys", "crypto_wallets", "api_credentials", "wifi_credentials", "two_factor_backups"]) {
    assert.match(normalizeSource, new RegExp(`result\\.${key}\\.map`), `normalizeImportResult must map result.${key}`);
    assert.match(normalizeSource, new RegExp(`candidate\\.${key}`), `isGlobalImportResult must validate candidate.${key}`);
  }
  for (const type of NEW_TYPES) {
    assert.match(normalizeSource, new RegExp(`createImportDraft\\("${type}"`), `normalizeImportResult must create "${type}" drafts`);
  }
});

test("save.ts routes every new credential type to secure_credentials and builds its payload from CREDENTIAL_TYPE_CONFIGS", () => {
  assert.match(saveSource, /import \{ CREDENTIAL_TYPE_CONFIGS, type CredentialType \} from "@\/lib\/credentialTypes"/);
  assert.match(saveSource, /isCredentialType\(draft\.type\)\) return "secure_credentials"/);
  assert.match(saveSource, /config\.fields\.map\(\(field\) => \[field\.key, draft\.fields\[field\.key\] \|\| ""\]\)/);
  assert.match(saveSource, /secure_credentials:\$\{config\.type\}/);
});

test("ImportTargetTable includes secure_credentials for undo support", () => {
  assert.match(historySource, /ImportTargetTable = "vault_items" \| "secure_notes" \| "secure_wallet" \| "secure_credentials"/);
});

test("GlobalMagicImport loads existing secure_credentials rows for duplicate detection", () => {
  assert.match(globalImportSource, /supabase\.from\("secure_credentials"\)\.select\("id,title,type,encrypted_content,iv,salt"\)/);
});

test("ImportReviewStep labels every new credential type via the canonical CREDENTIAL_TYPE_CONFIGS labels", () => {
  assert.match(reviewStepSource, /import \{ CREDENTIAL_TYPE_CONFIGS \} from "@\/lib\/credentialTypes"/);
  assert.match(reviewStepSource, /CREDENTIAL_TYPE_CONFIGS\.map\(\(config\) => \[config\.type, config\.label\]\)/);
});

test("ImportEditor masks the new secret fields and renders long-form fields as textareas", () => {
  assert.match(editorSource, /secureFields = new Set\(\["password", "cvv", "pin", "upi_pin", "passphrase", "apiSecret"\]\)/);
  assert.match(editorSource, /multilineFields = new Set\(\["content", "notes", "privateKey", "publicKey", "seedPhrase", "codes"\]\)/);
});

test("the paste-text AI prompt and its coercion cover all 9 categories", () => {
  for (const key of ["ssh_keys", "crypto_wallets", "api_credentials", "wifi_credentials", "two_factor_backups"]) {
    assert.match(actionsSource, new RegExp(`"${key}"`), `system prompt must mention "${key}"`);
    assert.match(actionsSource, new RegExp(`${key}: parsed\\.${key} \\|\\| \\[\\]`), `response coercion must default ${key}`);
  }
});

test("the image-scan global_import schema requires all 9 categories", () => {
  for (const key of ["ssh_keys", "crypto_wallets", "api_credentials", "wifi_credentials", "two_factor_backups"]) {
    assert.match(scanRouteSource, new RegExp(`${key}: \\{ type: Type\\.ARRAY`), `schema must declare ${key}`);
  }
  assert.match(
    scanRouteSource,
    /required: \["passwords", "notes", "bank_accounts", "credit_cards", "ssh_keys", "crypto_wallets", "api_credentials", "wifi_credentials", "two_factor_backups"\]/,
  );
});
