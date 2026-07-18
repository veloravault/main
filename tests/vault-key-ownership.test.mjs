import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  canUseVaultWrapper,
  commitForExpectedAuthenticatedUser,
  commitVaultKeyForExpectedUser,
  requireAuthenticatedVaultUserId,
  requireVaultWrapperOwner,
  scopeVaultKeyToAuthenticatedUser,
  shouldClearVaultKeyForAuthChange,
} from "../src/lib/vaultKeyOwnership.ts";

const USER_A = "550e8400-e29b-41d4-a716-446655440000";
const USER_B = "550e8400-e29b-41d4-a716-446655440001";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("a stale User A unlock result cannot commit after auth changes to User B", () => {
  let liveUserId = USER_A;
  let storedKey = null;
  let storedOwnerUserId = null;
  const expectedUserId = liveUserId;

  liveUserId = USER_B;
  const accepted = commitVaultKeyForExpectedUser(
    "raw-master-key-a",
    expectedUserId,
    liveUserId,
    (masterKey, ownerUserId) => {
      storedKey = masterKey;
      storedOwnerUserId = ownerUserId;
    },
  );

  assert.equal(accepted, false);
  assert.equal(storedKey, null);
  assert.equal(storedOwnerUserId, null);
  assert.equal(scopeVaultKeyToAuthenticatedUser(storedKey, storedOwnerUserId, USER_B), null);
});

test("a same-user unlock result commits to its captured owner", () => {
  let storedKey = null;
  let storedOwnerUserId = null;
  const accepted = commitVaultKeyForExpectedUser(
    "raw-master-key-a",
    USER_A,
    USER_A,
    (masterKey, ownerUserId) => {
      storedKey = masterKey;
      storedOwnerUserId = ownerUserId;
    },
  );

  assert.equal(accepted, true);
  assert.equal(scopeVaultKeyToAuthenticatedUser(storedKey, storedOwnerUserId, USER_A), "raw-master-key-a");
});

test("a stale User A enrollment cannot overwrite User B's wrapper", () => {
  let liveUserId = USER_A;
  let wrapper = { ownerUserId: USER_B, ciphertext: "wrapped-master-key-b" };
  const expectedUserId = liveUserId;

  liveUserId = USER_B;
  const accepted = commitForExpectedAuthenticatedUser(
    expectedUserId,
    (candidateUserId) => candidateUserId === liveUserId,
    (ownerUserId) => { wrapper = { ownerUserId, ciphertext: "wrapped-master-key-a" }; },
  );

  assert.equal(accepted, false);
  assert.deepEqual(wrapper, { ownerUserId: USER_B, ciphertext: "wrapped-master-key-b" });
});

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
  assert.match(pin, /savePinForMaster\([\s\S]*userId:\s*string,[\s\S]*isAuthenticatedUserCurrent:\s*AuthenticatedUserPredicate/);
  assert.match(pin, /isAuthenticatedUserCurrent/);
  assert.match(pin, /verifyPinAndRecoverMaster\([\s\S]*isAuthenticatedUserCurrent/);
  assert.match(pin, /const inputHash[\s\S]*isAuthenticatedUserCurrent\(ownerUserId\)[\s\S]*if \(inputHash !== parsed\.hash\)/);
  assert.match(pin, /savePinForMaster\(pin,\s*masterKey,\s*ownerUserId,\s*isAuthenticatedUserCurrent\)/);
  assert.match(biometrics, /BIO_OWNER_KEY/);
  assert.match(biometrics, /enableBiometrics\([\s\S]*userId:\s*string,[\s\S]*isAuthenticatedUserCurrent:\s*AuthenticatedUserPredicate/);
  assert.match(biometrics, /commitForExpectedAuthenticatedUser/);
  assert.match(biometrics, /unlockWithBiometrics\([\s\S]*userId:\s*string,[\s\S]*isAuthenticatedUserCurrent:\s*AuthenticatedUserPredicate/);
  assert.match(biometrics, /isAuthenticatedUserCurrent\(ownerUserId\)/);
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
  assert.match(provider, /setMasterKey:\s*\(value:\s*string,\s*expectedUserId:\s*string\)\s*=>\s*boolean/);
  assert.match(provider, /commitVaultKeyForExpectedUser\([\s\S]*currentUserIdRef\.current/);
  assert.match(provider, /isAuthenticatedUserCurrent:\s*\(expectedUserId:\s*string\)\s*=>\s*boolean/);

  const auth = read("src/components/Auth.tsx");
  const pinLock = read("src/components/PinLock.tsx");
  assert.match(auth, /onLogin:\s*\(masterPass:\s*string,\s*expectedUserId:\s*string\)\s*=>\s*boolean/);
  assert.match(auth, /onLogin\([^,]+,\s*expectedUserId\)/);
  assert.match(pinLock, /onUnlock:\s*\(masterKey:\s*string,\s*expectedUserId:\s*string\)\s*=>\s*boolean/);
  assert.match(pinLock, /onUnlock\(masterKey,\s*authenticatedUserId\)/);
});
