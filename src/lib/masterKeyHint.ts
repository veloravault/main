const MIN_LEAK_SUBSTRING_LENGTH = 4;

/**
 * A hint that only blocks a verbatim full-key match still lets a large,
 * guess-narrowing fragment of the master key through (e.g. a hint that
 * embeds half of a long passphrase). This rejects a hint that shares any
 * contiguous run of MIN_LEAK_SUBSTRING_LENGTH+ characters with the key,
 * case-insensitively - not just an exact full-string match.
 */
export function hintLeaksMasterKey(hint: string, masterKey: string): boolean {
  const normalizedHint = hint.toLocaleLowerCase();
  const normalizedKey = masterKey.toLocaleLowerCase();
  if (!normalizedHint || !normalizedKey) return false;

  const windowSize = Math.min(MIN_LEAK_SUBSTRING_LENGTH, normalizedKey.length);
  for (let i = 0; i + windowSize <= normalizedKey.length; i++) {
    if (normalizedHint.includes(normalizedKey.slice(i, i + windowSize))) return true;
  }
  return false;
}
