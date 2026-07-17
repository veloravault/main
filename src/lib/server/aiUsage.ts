import "server-only";

import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export type AiUsageKind = "scan" | "document_name" | "categorize" | "import";

/** Thrown when a Free-plan user has exhausted their monthly AI allowance. */
export class AiLimitReachedError extends Error {
  readonly code = "AI_LIMIT_REACHED";
  constructor() {
    super("Monthly AI limit reached");
    this.name = "AiLimitReachedError";
  }
}

/**
 * Records one AI operation against the user's monthly allowance. Throws
 * {@link AiLimitReachedError} if a Free-plan user is over their limit. Paid
 * plans always succeed. The DB function is the enforcement point; the server is
 * the trust boundary (it has already authenticated the token).
 */
export async function consumeAiCredit(userId: string, kind: AiUsageKind): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("try_consume_ai_credit", {
    p_user_id: userId,
    p_kind: kind,
  });
  if (error) throw error;
  if (data !== true) throw new AiLimitReachedError();
}
