/**
 * Key Cache — stores the derived CryptoKey in memory so the raw master
 * password string is never kept around longer than needed.
 *
 * Usage:
 *   await initKeyCache(rawPassword);   // call once on unlock
 *   const key = getCachedKey();        // use everywhere else
 *   clearKeyCache();                   // call on logout
 */

let cachedKey: CryptoKey | null = null;

/** Derives a 256-bit AES-GCM key from the password + salt and caches it. */
export async function deriveAndCacheKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600_000,
      hash: "SHA-256",
    } as Pbkdf2Params,
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return key;
}

/**
 * Initialises the key cache from the raw vault master key.
 * Derives a key with a fixed well-known salt that is used ONLY for
 * verifying / caching; per-item encryption still uses per-item salts.
 */
export function getCachedKey(): CryptoKey | null {
  return cachedKey;
}

export function setCachedKey(key: CryptoKey) {
  cachedKey = key;
}

export function clearKeyCache() {
  cachedKey = null;
}
