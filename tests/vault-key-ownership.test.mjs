import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  canUseVaultWrapper,
  requireAuthenticatedVaultUserId,
  requireVaultWrapperOwner,
  scopeVaultKeyToAuthenticatedUser,
  shouldClearVaultKeyForAuthChange,
} from "../src/lib/vaultKeyOwnership.ts";

const USER_A = "550e8400-e29b-41d4-a716-446655440000";
const USER_B = "550e8400-e29b-41d4-a716-446655440001";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("an authenticated user change invalidates User A raw and wrapped keys for User B", () => {
  const rawKeyA = "raw-master-key-a";
  const wrappedKeyA = { ownerUserId: USER_A, ciphertext: "wrapped-master-key-a" };

  assert.equal(scopeVaultKeyToAuthenticatedUser(rawKeyA, USER_A, USER_A), rawKeyA);
  assert.equal(canUseVaultWrapper(wrappedKeyA.ownerUserId, USER_A), true);

  assert.equal(shouldClearVaultKeyForAuthChange(USER_A, null), true);
  assert.equal(scopeVaultKeyToAuthenticatedUser(rawKeyA, USER_A, null), null);

  assert.equal(shouldClearVaultKeyForAuthChange(USER_A, USER_B), true);
  assert.equal(scopeVaultKeyToAuthenticatedUser(rawKeyA, USER_A, USER_B), null);
  assert.equal(canUseVaultWrapper(wrappedKeyA.ownerUserId, USER_B), false);
  assert.throws(() => requireVaultWrapperOwner(wrappedKeyA.ownerUserId, USER_B, "PIN"), /another account/i);
});

test("ownerless, malformed, and absent identities fail closed", () => {
  assert.equal(canUseVaultWrapper(undefined, USER_A), false);
  assert.equal(canUseVaultWrapper("legacy-owner", USER_A), false);
  assert.equal(canUseVaultWrapper(USER_A, undefined), false);
  assert.throws(() => requireVaultWrapperOwner(undefined, USER_A, "PIN"), /valid owner/i);
  assert.throws(() => requireVaultWrapperOwner("legacy-owner", USER_A, "biometric"), /valid owner/i);
  assert.throws(() => requireAuthenticatedVaultUserId(null), /authenticated user/i);
});

test("PIN and biometric helpers persist and require explicit ownership", () => {
  const pin = read("src/components/PinLock.tsx");
  const biometrics = read("src/lib/biometrics.ts");

  assert.match(pin, /ownerUserId/);
  assert.match(pin, /savePinForMaster\(pin:\s*string,\s*masterKey:\s*string,\s*userId:\s*string\)/);
  assert.match(pin, /verifyPinAndRecoverMaster\(pin:\s*string,\s*userId:\s*string\)/);
  assert.match(pin, /savePinForMaster\(pin,\s*masterKey,\s*ownerUserId\)/);
  assert.match(biometrics, /BIO_OWNER_KEY/);
  assert.match(biometrics, /enableBiometrics\(masterKey:\s*string,\s*userId:\s*string\)/);
  assert.match(biometrics, /unlockWithBiometrics\(userId:\s*string\)/);
});

test("every PIN and biometric UI call site supplies the authenticated user id", () => {
  for (const file of [
    "src/components/VaultApp.tsx",
    "src/components/Auth.tsx",
    "src/components/PinLock.tsx",
    "src/components/Dashboard.tsx",
    "src/components/settings/SecuritySettings.tsx",
    "src/components/settings/LocalVerificationSheet.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /authenticatedUserId/, `${file} does not consume authenticatedUserId`);
  }

  const provider = read("src/components/auth/VaultKeyProvider.tsx");
  assert.match(provider, /authenticatedUserId:\s*string \| null/);
});
