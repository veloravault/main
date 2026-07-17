import "server-only";

import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { isPlanId, planLimits, type PlanId } from "@/lib/plans";

export interface DocumentQuota {
  plan: PlanId;
  usedBytes: number;
  limitBytes: number;
}

/**
 * Reads the user's plan and current document byte usage. Used by the upload-url
 * route to refuse free / over-quota uploads before minting a presigned URL. The
 * DB trigger on vault_documents is still the final enforcement point.
 */
export async function getDocumentQuota(userId: string): Promise<DocumentQuota> {
  const admin = createSupabaseAdminClient();

  const memberResult = await admin
    .from("app_members")
    .select("plan")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (memberResult.error) throw memberResult.error;

  const plan: PlanId = isPlanId(memberResult.data?.plan) ? memberResult.data.plan : "free";

  const usageResult = await admin
    .from("vault_documents")
    .select("size_bytes")
    .eq("user_id", userId);
  if (usageResult.error) throw usageResult.error;

  const usedBytes = (usageResult.data ?? []).reduce(
    (sum, row) => sum + Number((row as { size_bytes?: number }).size_bytes ?? 0),
    0,
  );

  return { plan, usedBytes, limitBytes: planLimits(plan).documentBytes };
}
