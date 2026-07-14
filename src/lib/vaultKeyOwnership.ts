const SUPABASE_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeVaultUserId(value: unknown): string | null {
  if (typeof value !== "string" || !SUPABASE_USER_ID.test(value)) return null;
  return value.toLowerCase();
}

export function requireAuthenticatedVaultUserId(value: unknown): string {
  const userId = normalizeVaultUserId(value);
  if (!userId) throw new Error("A valid authenticated user is required for local vault unlock.");
  return userId;
}

export function canUseVaultWrapper(ownerUserId: unknown, authenticatedUserId: unknown): boolean {
  const owner = normalizeVaultUserId(ownerUserId);
  const current = normalizeVaultUserId(authenticatedUserId);
  return owner !== null && current !== null && owner === current;
}

export function requireVaultWrapperOwner(ownerUserId: unknown, authenticatedUserId: unknown, label: string): string {
  const current = requireAuthenticatedVaultUserId(authenticatedUserId);
  const owner = normalizeVaultUserId(ownerUserId);
  if (!owner) throw new Error(`${label} enrollment is missing a valid owner.`);
  if (owner !== current) throw new Error(`${label} enrollment belongs to another account.`);
  return owner;
}

export function shouldClearVaultKeyForAuthChange(previousUserId: unknown, currentUserId: unknown): boolean {
  const previous = normalizeVaultUserId(previousUserId);
  const current = normalizeVaultUserId(currentUserId);
  return current === null || previous !== current;
}

export function scopeVaultKeyToAuthenticatedUser(
  masterKey: string | null,
  ownerUserId: unknown,
  authenticatedUserId: unknown,
): string | null {
  return masterKey && canUseVaultWrapper(ownerUserId, authenticatedUserId) ? masterKey : null;
}
