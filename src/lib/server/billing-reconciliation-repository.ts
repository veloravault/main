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
}): Promise<{ items: AdminBillingReconciliationIssue[] }> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("billing_reconciliation_issues")
    .select("id,user_id,razorpay_subscription_id,action,intended_update,error_message,status,created_at,resolved_at")
    .order("created_at", { ascending: false })
    .limit(BILLING_RECONCILIATION_PAGE_SIZE);

  if (args.filter !== "all") query = query.eq("status", args.filter);

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

  return { items: rows.map((row) => issueDto(row, row.user_id ? emailById.get(row.user_id) ?? null : null)) };
}

export async function resolveBillingReconciliationIssueAdmin(args: {
  id: string;
  adminId: string;
}): Promise<AdminBillingReconciliationIssue | null> {
  const admin = createSupabaseAdminClient();
  const { data: issueRow, error: issueError } = await admin
    .from("billing_reconciliation_issues")
    .select("id,user_id,razorpay_subscription_id,action,intended_update,error_message,status,created_at,resolved_at")
    .eq("id", args.id)
    .maybeSingle();
  if (issueError) throw new Error("BILLING_RECONCILIATION_LOAD_FAILED");
  if (!issueRow) return null;
  const issue = issueRow as IssueRow;
  if (issue.status === "resolved") return issueDto(issue, null);

  const { error: applyError } = await admin
    .from("subscriptions")
    .update({ ...issue.intended_update, updated_at: new Date().toISOString() })
    .eq("razorpay_subscription_id", issue.razorpay_subscription_id);
  if (applyError) throw new Error("BILLING_RECONCILIATION_APPLY_FAILED");

  const resolvedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("billing_reconciliation_issues")
    .update({ status: "resolved", resolved_at: resolvedAt, resolved_by: args.adminId })
    .eq("id", args.id)
    .select("id,user_id,razorpay_subscription_id,action,intended_update,error_message,status,created_at,resolved_at")
    .maybeSingle();
  if (error) throw new Error("BILLING_RECONCILIATION_RESOLVE_FAILED");
  if (!data) return null;

  const { error: auditError } = await admin.from("admin_audit_log").insert({
    actor_user_id: args.adminId,
    member_user_id: issue.user_id,
    action: "billing_reconciliation_resolve",
    result_code: "RESOLVED",
  });
  if (auditError) console.error("ADMIN_BILLING_AUDIT_FAILED");

  let memberEmail: string | null = null;
  if (issue.user_id) {
    const { data: memberRow } = await admin.from("app_members").select("email").eq("user_id", issue.user_id).maybeSingle();
    memberEmail = memberRow?.email ?? null;
  }
  return issueDto(data as IssueRow, memberEmail);
}
