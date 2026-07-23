import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CREDENTIAL_TYPE_CONFIGS,
  SSH_KEY_CONFIG,
  CRYPTO_WALLET_CONFIG,
  API_CREDENTIAL_CONFIG,
  WIFI_CREDENTIAL_CONFIG,
  TWO_FACTOR_BACKUP_CONFIG,
} from "../src/lib/credentialTypes.ts";

test("CREDENTIAL_TYPE_CONFIGS contains exactly the five approved types, in order", () => {
  assert.deepEqual(
    CREDENTIAL_TYPE_CONFIGS.map((config) => config.type),
    ["ssh_key", "crypto_wallet", "api_credential", "wifi_credential", "two_factor_backup"],
  );
  assert.equal(CREDENTIAL_TYPE_CONFIGS[0], SSH_KEY_CONFIG);
  assert.equal(CREDENTIAL_TYPE_CONFIGS[1], CRYPTO_WALLET_CONFIG);
  assert.equal(CREDENTIAL_TYPE_CONFIGS[2], API_CREDENTIAL_CONFIG);
  assert.equal(CREDENTIAL_TYPE_CONFIGS[3], WIFI_CREDENTIAL_CONFIG);
  assert.equal(CREDENTIAL_TYPE_CONFIGS[4], TWO_FACTOR_BACKUP_CONFIG);
});

test("every config's primaryFieldKey matches one of its own fields, and every field has a non-empty key/label", () => {
  for (const config of CREDENTIAL_TYPE_CONFIGS) {
    const keys = config.fields.map((field) => field.key);
    assert.ok(
      keys.includes(config.primaryFieldKey),
      `${config.type}: primaryFieldKey "${config.primaryFieldKey}" must match one of its fields' keys (${keys.join(", ")})`,
    );
    assert.ok(new Set(keys).size === keys.length, `${config.type}: field keys must be unique`);
    for (const field of config.fields) {
      assert.ok(field.key.length > 0, `${config.type}: every field needs a key`);
      assert.ok(field.label.length > 0, `${config.type}: every field needs a label`);
      assert.ok(["text", "password", "textarea"].includes(field.type), `${config.type}: field "${field.key}" has an invalid type "${field.type}"`);
    }
  }
});

test("every config has at least one required field, a non-empty label/itemNoun, and a valid icon component", () => {
  for (const config of CREDENTIAL_TYPE_CONFIGS) {
    assert.ok(config.fields.some((field) => field.required), `${config.type}: expected at least one required field`);
    assert.ok(config.label.length > 0, `${config.type}: label must not be empty`);
    assert.ok(config.itemNoun.length > 0, `${config.type}: itemNoun must not be empty`);
    assert.ok(config.icon, `${config.type}: icon must be set`);
  }
});

test("SSH key config matches the approved field set", () => {
  assert.deepEqual(SSH_KEY_CONFIG.fields.map((f) => f.key), ["privateKey", "publicKey", "host", "passphrase", "notes"]);
  assert.equal(SSH_KEY_CONFIG.primaryFieldKey, "privateKey");
});

test("crypto wallet config matches the approved field set", () => {
  assert.deepEqual(CRYPTO_WALLET_CONFIG.fields.map((f) => f.key), ["seedPhrase", "walletAddress", "notes"]);
  assert.equal(CRYPTO_WALLET_CONFIG.primaryFieldKey, "seedPhrase");
});

test("API credential config matches the approved field set", () => {
  assert.deepEqual(API_CREDENTIAL_CONFIG.fields.map((f) => f.key), ["serviceName", "apiKey", "apiSecret", "notes"]);
  assert.equal(API_CREDENTIAL_CONFIG.primaryFieldKey, "apiSecret");
});

test("WiFi credential config matches the approved field set", () => {
  assert.deepEqual(WIFI_CREDENTIAL_CONFIG.fields.map((f) => f.key), ["networkName", "password", "notes"]);
  assert.equal(WIFI_CREDENTIAL_CONFIG.primaryFieldKey, "password");
});

test("2FA backup config matches the approved field set", () => {
  assert.deepEqual(TWO_FACTOR_BACKUP_CONFIG.fields.map((f) => f.key), ["serviceName", "codes", "notes"]);
  assert.equal(TWO_FACTOR_BACKUP_CONFIG.primaryFieldKey, "codes");
});
