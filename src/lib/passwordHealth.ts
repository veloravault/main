/**
 * Password Health - utilities for analysing password strength and finding reused passwords.
 */

export type StrengthLevel = "weak" | "fair" | "strong" | "very-strong";

export interface StrengthResult {
  level: StrengthLevel;
  score: number; // 0–100
  label: string;
  color: string; // tailwind text color
  bg: string;    // tailwind bg color
}

/**
 * Scores a password from 0–100 and categorises it.
 * Heuristics: length, character variety, common patterns.
 */
export function getStrength(password: string): StrengthResult {
  if (!password || password === "Decryption Failed") {
    return { level: "weak", score: 0, label: "Unknown", color: "text-muted-foreground", bg: "bg-muted" };
  }

  let score = 0;

  // Length score (up to 40pts)
  if (password.length >= 8)  score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  // Character variety (up to 40pts)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 10;

  // Bonus for no common patterns (up to 20pts)
  const commonPatterns = [/^[a-z]+$/i, /^[0-9]+$/, /password/i, /123/, /qwerty/i, /abc/i];
  const hasPattern = commonPatterns.some(p => p.test(password));
  if (!hasPattern) score += 20;

  score = Math.min(100, score);

  if (score < 30) return { level: "weak",        score, label: "Weak",        color: "text-red-500",   bg: "bg-red-500" };
  if (score < 55) return { level: "fair",         score, label: "Fair",        color: "text-amber-500", bg: "bg-amber-500" };
  if (score < 80) return { level: "strong",       score, label: "Strong",      color: "text-blue-500",  bg: "bg-blue-500" };
  return             { level: "very-strong",   score, label: "Very Strong", color: "text-emerald-500", bg: "bg-emerald-500" };
}

/**
 * Returns a Set of IDs whose passwords are duplicated by another entry.
 */
export function findDuplicateIds(items: { id: string; plaintext: string }[]): Set<string> {
  const seen = new Map<string, string>(); // password → first id
  const dupes = new Set<string>();

  for (const item of items) {
    const pw = item.plaintext.trim();
    if (!pw || pw === "Decryption Failed") continue;
    if (seen.has(pw)) {
      dupes.add(item.id);
      const firstId = seen.get(pw)!;
      dupes.add(firstId);
    } else {
      seen.set(pw, item.id);
    }
  }
  return dupes;
}

/**
 * Computes an overall vault health score 0–100.
 */
export function getVaultHealthScore(items: { id: string; plaintext: string }[]): {
  score: number;
  weak: number;
  reused: number;
  total: number;
  label: string;
  color: string;
} {
  if (items.length === 0) return { score: 100, weak: 0, reused: 0, total: 0, label: "Perfect", color: "text-emerald-500" };

  const dupeIds = findDuplicateIds(items);
  let weakCount = 0;

  for (const item of items) {
    const { level } = getStrength(item.plaintext);
    if (level === "weak" || level === "fair") weakCount++;
  }

  const reusedCount = dupeIds.size;
  const penaltyPerWeak   = 60 / items.length;
  const penaltyPerReused = 40 / items.length;
  const score = Math.max(0, Math.round(100 - weakCount * penaltyPerWeak - reusedCount * penaltyPerReused));

  let label = "Critical";
  let color = "text-red-500";
  if (score >= 80) { label = "Great";  color = "text-emerald-500"; }
  else if (score >= 60) { label = "Fair";  color = "text-amber-500"; }
  else if (score >= 40) { label = "Poor";  color = "text-orange-500"; }

  return { score, weak: weakCount, reused: reusedCount, total: items.length, label, color };
}
