/**
 * Vault Cache - simple in-memory store that holds already-decrypted
 * items per table so tab switches don't re-fetch from Supabase.
 *
 * Usage:
 *   setCache("vault_items", decryptedItems);
 *   const cached = getCache<DecryptedItem>("vault_items");
 *   invalidateCache("vault_items");   // call after any write
 *   clearAllCaches();                 // call on logout
 */

type CacheStore = Map<string, { data: unknown[]; timestamp: number }>;

const store: CacheStore = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCache<T>(key: string): T[] | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.data as T[];
}

export function setCache<T>(key: string, data: T[]): void {
  store.set(key, { data: data as unknown[], timestamp: Date.now() });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

export function clearAllCaches(): void {
  store.clear();
}
