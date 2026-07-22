import "server-only";

import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const BILLING_RECONCILIATION_PAGE_SIZE = 50;

export type BillingReconciliationAction = "cancel" | "change_period";
export type BillingReconciliationStatus = "pending" | "resolved";
export type BillingReconciliationFilter = BillingReconciliationStatus | "all";

export type AdminBillingReconciliationIssue = {
  id: string;
  userId: string | null;
  memberEmail: string | null;
  razorpaySubscriptionId: string;
  action: BillingReconciliationAction;
  intendedUpdate: Record<string, unknown>;
  errorMessage: string | null;
  status: BillingReconciliationStatus;
  createdAt: string;
  resolvedAt: string | null;
};

type IssueRow = {
  id: string;
  user_id: string | null;
  razorpay_subscription_id: string;
  action: BillingReconciliationAction;
  intended_update: Record<string, unknown>;
  error_message: string | null;
  status: BillingReconciliationStatus;
  created_at: string;
  resolved_at: string | null;
};

export type BillingReconciliationCursor = { createdAt: string; id: string };
const BILLING_CURSOR_PATTERN = /^[A-Za-z0-9_-]+$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeBillingReconciliationCursor(cursor: BillingReconciliationCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function parseBillingReconciliationCursor(value: string | null): BillingReconciliationCursor | null {
  if (!value || value.length > 400 || !BILLING_CURSOR_PATTERN.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<BillingReconciliationCursor>;
    if (
      typeof parsed.createdAt !== "string"
      || !ISO_TIMESTAMP.test(parsed.createdAt)
      || !Number.isFinite(Date.parse(parsed.createdAt))
      || typeof parsed.id !== "string"
      || !UUID.test(parsed.id)
    ) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function issueDto(row: IssueRow, memberEmail: string | null): AdminBillingReconciliationIssue {
  return {
    id: row.id,
    userId: row.user_id,
    memberEmail,
    razorpaySubscriptionId: row.razorpay_subscription_id,
    action: row.action,
    intendedUpdate: row.intended_update,
    errorMessage: row.error_message,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

// Best-effort: called from inside a catch block for an already-applied
// Razorpay change, so a failure here must never throw back into the request.
export async function recordBillingReconciliationIssue(args: {
  userId: string;
  razorpaySubscriptionId: string;
  action: BillingReconciliationAction;
  intendedUpdate: Record<string, unknown>;
  errorMessage: string;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("billing_reconciliation_issues").insert({
      user_id: args.userId,
      razorpay_subscription_id: args.razorpaySubscriptionId,
      action: args.action,
      intended_update: args.intendedUpdate,
      error_message: args.errorMessage,
    });
    if (error) console.error("BILLING_RECONCILIATION_RECORD_FAILED", error);
  } catch (error) {
    console.error("BILLING_RECONCILIATION_RECORD_FAILED", error);
  }
}

export async function listBillingReconciliationIssuesAdmin(args: {
  filter: BillingReconciliationFilter;
  cursor: BillingReconciliationCursor | null;
}): Promise<{ items: AdminBillingReconciliationIssue[]; nextCursor: string | null }> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("billing_reconciliation_issues")
    .select("id,user_id,razorpay_subscription_id,action,intended_update,error_message,status,created_at,resolved_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(BILLING_RECONCILIATION_PAGE_SIZE);

  if (args.filter !== "all") query = query.eq("status", args.filter);
  if (args.cursor) {
    query = query.or(
      `created_at.lt.${args.cursor.createdAt},and(created_at.eq.${args.cursor.createdAt},id.lt.${args.cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("BILLING_RECONCILIATION_LIST_FAILED");
  const rows = (data ?? []) as IssueRow[];

  const userIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))];
  const emailById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: members, error: memberError } = await admin
      .from("app_members")
      .select("user_id,email")
      .in("user_id", userIds);
    if (memberError) throw new Error("BILLING_RECONCILIATION_MEMBERS_FAILED");
    for (const member of members ?? []) emailById.set(member.user_id, member.email);
  }

  const lastRow = rows[rows.length - 1];
  const nextCursor = rows.length === BILLING_RECONCILIATION_PAGE_SIZE && lastRow
    ? encodeBillingReconciliationCursor({ createdAt: lastRow.created_at, id: lastRow.id })
    : null;

  return {
    items: rows.map((row) => issueDto(row, row.user_id ? emailById.get(row.user_id) ?? null : null)),
    nextCursor,
  };
}

export type ResolveBillingReconciliationResult =
  | { outcome: "resolved"; issue: AdminBillingReconciliationIssue }
  | { outcome: "not_found" }
  | { outcome: "already_resolved" }
  | { outcome: "subscription_not_found" };

// Delegates the whole read-check-apply-mark-audit sequence to a single
// Postgres function (resolve_billing_reconciliation_issue) that row-locks
// the issue and runs it all in one transaction - see the migration for why:
// two concurrent resolves could otherwise both pass a pending check and
// both apply the fix/write an audit row, and a corrective update that
// silently matched zero rows could still get marked "resolved".
export async function resolveBillingReconciliationIssueAdmin(args: {
  id: string;
  adminId: string;
}): Promise<ResolveBillingReconciliationResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .rpc("resolve_billing_reconciliation_issue", { p_issue_id: args.id, p_admin_id: args.adminId })
    .maybeSingle();

  if (error) {
    if (error.code === "P0001") return { outcome: "not_found" };
    if (error.code === "P0002") return { outcome: "already_resolved" };
    if (error.code === "P0003") return { outcome: "subscription_not_found" };
    throw new Error("BILLING_RECONCILIATION_RESOLVE_FAILED");
  }
  if (!data) return { outcome: "not_found" };

  const row = data as IssueRow;
  let memberEmail: string | null = null;
  if (row.user_id) {
    const { data: memberRow } = await admin.from("app_members").select("email").eq("user_id", row.user_id).maybeSingle();
    memberEmail = memberRow?.email ?? null;
  }
  return { outcome: "resolved", issue: issueDto(row, memberEmail) };
}
