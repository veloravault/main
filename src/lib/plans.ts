// Plan definitions and limits for the Free / Plus / Family tiers.
//
// This is the single source of truth on the client. The same numbers are
// mirrored in the Postgres migration (20260717120000_pricing_plans.sql), which
// is where the limits are actually *enforced* — keep the two in sync when
// changing a limit. Marketing copy lives in components/dreelio/pricing-data.ts.

export type PlanId = "free" | "plus" | "family";

export const PLAN_IDS: readonly PlanId[] = ["free", "plus", "family"] as const;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export interface PlanLimits {
  id: PlanId;
  label: string;
  /** Total encrypted document storage, in bytes. */
  documentBytes: number;
  /** Max wallet/bank records, or null for unlimited. */
  walletRecords: number | null;
  /** AI operations allowed per calendar month, or null for unlimited. */
  aiPerMonth: number | null;
}

export const GIGABYTE = 1024 * 1024 * 1024;

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    label: "Free",
    documentBytes: 0,
    walletRecords: 3,
    aiPerMonth: 5,
  },
  plus: {
    id: "plus",
    label: "Plus",
    documentBytes: 5 * GIGABYTE,
    walletRecords: null,
    aiPerMonth: null,
  },
  family: {
    id: "family",
    label: "Family",
    documentBytes: 5 * GIGABYTE,
    walletRecords: null,
    aiPerMonth: null,
  },
};

export function planLimits(plan: PlanId): PlanLimits {
  return PLANS[plan] ?? PLANS.free;
}

/** Human-readable byte size, e.g. 5368709120 -> "5 GB", 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const rounded = value >= 100 || exponent === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[exponent]}`;
}
