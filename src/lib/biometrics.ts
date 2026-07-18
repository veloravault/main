"use client";

import { canUseVaultWrapper, commitForExpectedAuthenticatedUser, requireAuthenticatedVaultUserId, requireVaultWrapperOwner, type AuthenticatedUserPredicate } from "@/lib/vaultKeyOwnership";

// Keys for localStorage
const BIO_ENCRYPTED_KEY = "vault_bio_encrypted_master";
const BIO_CRED_ID = "vault_bio_credential_id";
const BIO_OWNER_KEY = "vault_bio_owner_user_id";

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

export function disableBiometrics(userId: string): void {
  if (typeof window === "undefined") return;
  requireVaultWrapperOwner(localStorage.getItem(BIO_OWNER_KEY), userId, "Biometric");
  localStorage.removeItem(BIO_ENCRYPTED_KEY);
  localStorage.removeItem(BIO_CRED_ID);
  localStorage.removeItem(BIO_OWNER_KEY);
}

export async function enableBiometrics(
  masterKey: string,
  userId: string,
  isAuthenticatedUserCurrent: AuthenticatedUserPredicate,
): Promise<void> {
  const ownerUserId = requireAuthenticatedVaultUserId(userId);
  if (!isAuthenticatedUserCurrent(ownerUserId)) throw new Error("The authenticated account changed during biometric enrollment.");
  if (!isBiometricsSupported()) throw new Error("Biometrics not supported on this device/browser.");

  // Generate a secure 32-byte (256-bit) AES key
  const aesKey = crypto.getRandomValues(new Uint8Array(32));

  // The challenge doesn't strictly matter for local-only registration, but must be random.
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  
  // Request biometric registration
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "Velora Vault",
        id: window.location.hostname
      },
      user: {
        id: aesKey, // Store our AES key inside the userHandle!
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
        residentKey: "required" // Discoverable credential required so userHandle is returned
      },
      timeout: 60000
    }
  }) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Biometric registration cancelled or failed.");
  }

  // Save the encrypted master key
  const encryptedMaster = await encryptWithRawKey(masterKey, aesKey);
  
  const committed = commitForExpectedAuthenticatedUser(
    ownerUserId,
    isAuthenticatedUserCurrent,
    (verifiedOwnerUserId) => {
      localStorage.setItem(BIO_ENCRYPTED_KEY, encryptedMaster);
      // Store the credential ID so we can specify it in the allowList later
      localStorage.setItem(BIO_CRED_ID, credential.id);
      localStorage.setItem(BIO_OWNER_KEY, verifiedOwnerUserId);
    },
  );
  if (!committed) throw new Error("The authenticated account changed during biometric enrollment.");
}

export async function unlockWithBiometrics(
  userId: string,
  isAuthenticatedUserCurrent: AuthenticatedUserPredicate,
): Promise<string> {
  const ownerUserId = requireVaultWrapperOwner(localStorage.getItem(BIO_OWNER_KEY), userId, "Biometric");

  const encryptedMaster = localStorage.getItem(BIO_ENCRYPTED_KEY);
  const credIdBase64url = localStorage.getItem(BIO_CRED_ID);
  if (!encryptedMaster || !credIdBase64url) throw new Error("Biometrics not set up.");

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  // Request biometric authentication
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [{
        type: "public-key",
        id: base64urlToBuffer(credIdBase64url),
      }],
      userVerification: "required",
      timeout: 60000
    }
  });

  // The WebAuthn prompt is a multi-second user-interaction gap -- re-check the
  // authenticated user is still who we started this for, matching every
  // sibling function here (enableBiometrics, savePinForMaster,
  // verifyPinAndRecoverMaster) instead of only checking once up front.
  if (!isAuthenticatedUserCurrent(ownerUserId)) {
    throw new Error("The authenticated account changed during biometric unlock.");
  }

  if (!(assertion instanceof PublicKeyCredential) || !(assertion.response instanceof AuthenticatorAssertionResponse) || !assertion.response.userHandle) {
    throw new Error("Authentication failed or device did not return the decryption key.");
  }

  // The userHandle IS our AES key
  const aesKey = new Uint8Array(assertion.response.userHandle);

  // Decrypt the master key
  try {
    const masterKey = await decryptWithRawKey(encryptedMaster, aesKey);
    return masterKey;
  } catch (err) {
    console.error("Biometric decryption failed:", err);
    throw new Error("Failed to decrypt master key. You may need to reset biometric unlock.");
  }
}
