"use client";

import { canUseVaultWrapper, commitForExpectedAuthenticatedUser, requireAuthenticatedVaultUserId, requireVaultWrapperOwner, type AuthenticatedUserPredicate } from "@/lib/vaultKeyOwnership";
import { BiometricError, normalizeBiometricError, type BiometricOperation } from "@/lib/biometricErrors";

// Keys for localStorage
const BIO_ENCRYPTED_KEY = "vault_bio_encrypted_master";
const BIO_CRED_ID = "vault_bio_credential_id";
const BIO_OWNER_KEY = "vault_bio_owner_user_id";
const BIO_SCHEME_KEY = "vault_bio_scheme";

// The wrapping key used to come from the WebAuthn userHandle field, which
// the spec does not treat as confidential - platform authenticators can sync
// it (along with the rest of a discoverable credential) into OS/cloud passkey
// storage never intended to hold vault key material. The PRF extension is
// the spec-sanctioned way to get a secret, per-credential value out of an
// authenticator instead, so this is the only scheme going forward.
const PRF_SCHEME = "prf-v1";
// Fixed, non-secret domain-separation input for the PRF evaluation - it
// doesn't need to be secret, it just keeps this app's derived secret distinct
// from whatever else might eval the same credential. Must stay identical
// between enrollment and every unlock.
const PRF_SALT = new TextEncoder().encode("velora-vault:biometric-unlock:v1");

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer.buffer;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

// AES-GCM Encryption using the raw 32-byte AES key
async function encryptWithRawKey(data: string, rawKey: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    bytesToArrayBuffer(rawKey),
    "AES-GCM",
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(data)
  );

  // Combine IV and Ciphertext
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decryptWithRawKey(cipherB64: string, rawKey: Uint8Array): Promise<string> {
  const combined = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const key = await crypto.subtle.importKey(
    "raw",
    bytesToArrayBuffer(rawKey),
    "AES-GCM",
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * Runs a WebAuthn `get()` ceremony against one credential and returns the
 * PRF-derived secret for it. This is the only place that talks to
 * `navigator.credentials.get()` for biometric unlock/enrollment.
 */
async function evaluatePrf(credentialId: BufferSource, operation: BiometricOperation): Promise<Uint8Array> {
  let assertion: Credential | null;
  try {
    assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        allowCredentials: [{ type: "public-key", id: credentialId }],
        userVerification: "required",
        extensions: { prf: { eval: { first: PRF_SALT } } },
        timeout: 60000,
      },
    });
  } catch (reason) {
    throw normalizeBiometricError(reason, operation);
  }

  if (!(assertion instanceof PublicKeyCredential)) {
    throw new BiometricError(
      "credential_unavailable",
      "This device did not return the saved biometric credential. Use your master key, then set up biometric unlock again.",
    );
  }

  const prfResult = assertion.getClientExtensionResults().prf?.results?.first;
  if (!prfResult) {
    throw new BiometricError(
      "unsupported",
      "This device's biometric hardware does not support a security feature Velora Vault requires. Use your PIN or master key instead.",
    );
  }
  return new Uint8Array(prfResult as ArrayBuffer);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function isBiometricsSupported(): boolean {
  return typeof window !== "undefined" &&
         !!window.PublicKeyCredential &&
         // Need a secure context for WebAuthn (or localhost)
         window.isSecureContext;
}

export function hasBiometricsEnabled(userId: string): boolean {
  return !!(
    typeof window !== "undefined" &&
    localStorage.getItem(BIO_ENCRYPTED_KEY) &&
    localStorage.getItem(BIO_CRED_ID) &&
    canUseVaultWrapper(localStorage.getItem(BIO_OWNER_KEY), userId)
  );
}

/**
 * True when a biometric enrollment exists from before the PRF-based scheme
 * (the wrapping key used to live in the WebAuthn userHandle field, which is
 * not confidential) - unlockWithBiometrics refuses these outright rather
 * than attempting a ceremony that can't decrypt anything. UI surfaces should
 * use this to prompt a one-time re-enrollment via enableBiometrics.
 */
export function needsBiometricReEnrollment(userId: string): boolean {
  if (!hasBiometricsEnabled(userId)) return false;
  return localStorage.getItem(BIO_SCHEME_KEY) !== PRF_SCHEME;
}

export function disableBiometrics(userId: string): void {
  if (typeof window === "undefined") return;
  requireVaultWrapperOwner(localStorage.getItem(BIO_OWNER_KEY), userId, "Biometric");
  localStorage.removeItem(BIO_ENCRYPTED_KEY);
  localStorage.removeItem(BIO_CRED_ID);
  localStorage.removeItem(BIO_OWNER_KEY);
  localStorage.removeItem(BIO_SCHEME_KEY);
}

export async function enableBiometrics(
  masterKey: string,
  userId: string,
  isAuthenticatedUserCurrent: AuthenticatedUserPredicate,
): Promise<void> {
  const ownerUserId = requireAuthenticatedVaultUserId(userId);
  if (!isAuthenticatedUserCurrent(ownerUserId)) {
    throw new BiometricError("account_changed", "The signed-in account changed during biometric setup. Try again.");
  }
  if (!isBiometricsSupported()) {
    throw new BiometricError("unsupported", "This device or browser does not support biometric unlock. Continue with your master key.");
  }

  // The challenge doesn't strictly matter for local-only registration, but must be random.
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  // Just an opaque discoverable-credential identifier now - unlike what this
  // field used to carry, it is not confidential (WebAuthn's userHandle isn't
  // a secret channel and can be synced by the OS/platform along with the
  // passkey itself), so nothing sensitive is lost if it ever leaks.
  const opaqueUserHandle = crypto.getRandomValues(new Uint8Array(32));

  // Request biometric registration
  let credential: Credential | null;
  try {
    credential = await navigator.credentials.create({
      publicKey: {
      challenge,
      rp: {
        name: "Velora Vault",
        id: window.location.hostname
      },
      user: {
        id: opaqueUserHandle,
        name: "vault_biometric_user",
        displayName: "Vault Biometric Unlock"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },  // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Force Face ID / Touch ID / Windows Hello
        userVerification: "required",
        residentKey: "required" // Discoverable credential required so we can look it up later
      },
      extensions: { prf: { eval: { first: PRF_SALT } } },
      timeout: 60000
      }
    });
  } catch (reason) {
    throw normalizeBiometricError(reason, "enroll");
  }

  if (!(credential instanceof PublicKeyCredential)) {
    throw new BiometricError("prompt_cancelled", "Biometric setup was not completed. Try again or continue with your master key.");
  }

  if (!credential.getClientExtensionResults().prf?.enabled) {
    throw new BiometricError(
      "unsupported",
      "This device's biometric hardware does not support a security feature Velora Vault requires. Use your PIN or master key instead.",
    );
  }

  // The PRF result generally isn't available directly from create() across
  // browsers yet - a follow-up get() ceremony (one more biometric prompt,
  // only during this one-time setup) is what actually returns the secret.
  const wrappingKey = await evaluatePrf(credential.rawId, "enroll");

  // Save the encrypted master key
  const encryptedMaster = await encryptWithRawKey(masterKey, wrappingKey);

  const committed = commitForExpectedAuthenticatedUser(
    ownerUserId,
    isAuthenticatedUserCurrent,
    (verifiedOwnerUserId) => {
      localStorage.setItem(BIO_ENCRYPTED_KEY, encryptedMaster);
      // Store the credential ID so we can specify it in the allowList later
      localStorage.setItem(BIO_CRED_ID, credential.id);
      localStorage.setItem(BIO_OWNER_KEY, verifiedOwnerUserId);
      localStorage.setItem(BIO_SCHEME_KEY, PRF_SCHEME);
    },
  );
  if (!committed) {
    throw new BiometricError("account_changed", "The signed-in account changed during biometric setup. Try again.");
  }
}

export async function unlockWithBiometrics(
  userId: string,
  isAuthenticatedUserCurrent: AuthenticatedUserPredicate,
): Promise<string> {
  const ownerUserId = requireVaultWrapperOwner(localStorage.getItem(BIO_OWNER_KEY), userId, "Biometric");

  const encryptedMaster = localStorage.getItem(BIO_ENCRYPTED_KEY);
  const credIdBase64url = localStorage.getItem(BIO_CRED_ID);
  if (!encryptedMaster || !credIdBase64url) {
    throw new BiometricError("credential_unavailable", "Biometric unlock is not set up on this device. Use your PIN or master key.");
  }

  if (localStorage.getItem(BIO_SCHEME_KEY) !== PRF_SCHEME) {
    throw new BiometricError(
      "reset_required",
      "Biometric unlock needs to be set up again after a security update. Use your master key, then re-enable biometric unlock in Settings.",
    );
  }

  const wrappingKey = await evaluatePrf(base64urlToBuffer(credIdBase64url), "unlock");

  // The WebAuthn prompt is a multi-second user-interaction gap -- re-check the
  // authenticated user is still who we started this for, matching every
  // sibling function here (enableBiometrics, savePinForMaster,
  // verifyPinAndRecoverMaster) instead of only checking once up front.
  if (!isAuthenticatedUserCurrent(ownerUserId)) {
    throw new BiometricError("account_changed", "The signed-in account changed during biometric unlock. Try again.");
  }

  // Decrypt the master key
  try {
    return await decryptWithRawKey(encryptedMaster, wrappingKey);
  } catch (err) {
    console.error("Biometric decryption failed:", err);
    throw new BiometricError("reset_required", "Biometric unlock could not open this vault. Use your master key, then reset biometric unlock in Settings.", { cause: err });
  }
}
