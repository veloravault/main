import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  BiometricError,
  normalizeBiometricError,
} from "../src/lib/biometricErrors.ts";

const RAW_BROWSER_MESSAGE = "The operation either timed out or was not allowed.";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function namedError(name, message = RAW_BROWSER_MESSAGE) {
  return Object.assign(new Error(message), { name });
}

test("maps cancelled or expired prompts to an actionable retry message", () => {
  for (const name of ["NotAllowedError", "AbortError"]) {
    const mapped = normalizeBiometricError(namedError(name), "unlock");
    assert.equal(mapped.code, "prompt_cancelled");
    assert.equal(
      mapped.message,
      "Face ID, Touch ID, or your device prompt was cancelled or timed out. Try again.",
    );
    assert.doesNotMatch(mapped.message, /operation either timed out/i);
  }
});

test("maps unsupported and insecure contexts without leaking browser text", () => {
  const unsupported = normalizeBiometricError(namedError("NotSupportedError"), "enroll");
  assert.equal(unsupported.code, "unsupported");
  assert.match(unsupported.message, /does not support/i);

  const insecure = normalizeBiometricError(namedError("SecurityError"), "unlock");
  assert.equal(insecure.code, "insecure_context");
  assert.match(insecure.message, /secure, supported browser/i);
});

test("uses operation-specific recovery for unavailable credentials", () => {
  const enrollment = normalizeBiometricError(namedError("InvalidStateError"), "enroll");
  assert.equal(enrollment.code, "credential_exists");
  assert.match(enrollment.message, /may already be registered/i);

  const unlock = normalizeBiometricError(namedError("InvalidStateError"), "unlock");
  assert.equal(unlock.code, "credential_unavailable");
  assert.match(unlock.message, /master key/i);
  assert.match(unlock.message, /set up biometric unlock again/i);
});

test("keeps normalized application errors stable", () => {
  const original = new BiometricError("account_changed", "The signed-in account changed. Try again.");
  assert.equal(normalizeBiometricError(original, "unlock"), original);
});

test("maps unknown failures to neutral operation-specific copy", () => {
  const enrollment = normalizeBiometricError(new Error("vendor diagnostic"), "enroll");
  assert.equal(enrollment.code, "unexpected");
  assert.equal(enrollment.message, "Biometric setup could not be completed. Try again or continue with your master key.");
  assert.doesNotMatch(enrollment.message, /vendor diagnostic/);

  const unlock = normalizeBiometricError("vendor diagnostic", "unlock");
  assert.equal(unlock.message, "Biometric unlock could not be completed. Use your PIN or master key and try again.");
});

test("native WebAuthn calls are normalized inside the biometric boundary", () => {
  const biometrics = read("src/lib/biometrics.ts");
  assert.match(biometrics, /normalizeBiometricError\(reason,\s*"enroll"\)/);
  assert.match(biometrics, /normalizeBiometricError\(reason,\s*"unlock"\)/);
  assert.doesNotMatch(biometrics, /operation either timed out or was not allowed/i);
});

test("every biometric surface uses the shared boundary and accessible recovery UI", () => {
  const surfaces = [
    "src/components/Auth.tsx",
    "src/components/Dashboard.tsx",
    "src/components/PinLock.tsx",
    "src/components/settings/LocalVerificationSheet.tsx",
    "src/components/settings/SecuritySettings.tsx",
  ];

  for (const path of surfaces) {
    const source = read(path);
    assert.doesNotMatch(source, /navigator\.credentials/, `${path} bypasses the biometric boundary`);
    assert.doesNotMatch(source, /operation either timed out or was not allowed/i, `${path} contains raw browser copy`);
  }

  const auth = read("src/components/Auth.tsx");
  const pinLock = read("src/components/PinLock.tsx");
  const verification = read("src/components/settings/LocalVerificationSheet.tsx");
  const security = read("src/components/settings/SecuritySettings.tsx");
  assert.match(auth, /pinError[\s\S]{0,220}role="alert"/);
  assert.match(auth, /error[\s\S]{0,220}role="alert"/);
  assert.match(pinLock, /role="alert"/);
  assert.match(pinLock, /Use vault master key instead/);
  assert.match(verification, /role="alert"/);
  assert.match(security, /role="alert"/);
});
