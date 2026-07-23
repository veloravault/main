import "server-only";

import type { MemberStatus } from "@/lib/access/types";
import type { PlanId } from "@/lib/plans";
import { isConfiguredAdminUserId } from "@/lib/server/access";
import { requiredAppUrl } from "@/lib/server/request-security";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export type AdminMemberUsage = {
  documentBytes: number;
  documents: number;
  aiEventsThisMonth: number;
  passwords: number;
  notes: number;
  walletRecords: number;
  bankAccounts: number;
  credentials: number;
  supportTickets: number;
};

export type AdminMemberDetailDto = {
  id: string;
  email: string;
  status: MemberStatus;
  plan: PlanId;
  accessRequestId: string | null;
  approvedAt: string;
  activatedAt: string | null;
  createdAt: string;
  isOwner: boolean;
  usage: AdminMemberUsage;
};

type MemberRow = {
  user_id: string;
  email: string;
  status: MemberStatus;
  plan: string;
  access_request_id: string | null;
  approved_at: string;
  activated_at: string | null;
  created_at: string;
};

const DOCUMENT_PAGE_SIZE = 1_000;

async function memberDocumentBytes(memberId: string) {
  const admin = createSupabaseAdminClient();
  let total = 0;
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from("vault_documents")
      .select("size_bytes")
      .eq("user_id", memberId)
      .range(from, from + DOCUMENT_PAGE_SIZE - 1);
    if (error) throw new Error("ADMIN_MEMBER_DOCUMENT_USAGE_FAILED");
    const rows = data ?? [];
    total += rows.reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0);
    if (rows.length < DOCUMENT_PAGE_SIZE) return total;
    from += DOCUMENT_PAGE_SIZE;
  }
}

export async function getMemberDetailAdmin(memberId: string): Promise<AdminMemberDetailDto | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("app_members")
    .select("user_id,email,status,plan,access_request_id,approved_at,activated_at,created_at")
    .eq("user_id", memberId)
    .maybeSingle();
  if (error) throw new Error("ADMIN_MEMBER_DETAIL_FAILED");
  if (!data) return null;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [documents, aiEvents, passwords, notes, wallet, banks, credentials, tickets, documentBytes] = await Promise.all([
    admin.from("vault_documents").select("id", { count: "exact", head: true }).eq("user_id", memberId),
    admin.from("ai_usage_events").select("id", { count: "exact", head: true }).eq("user_id", memberId).gte("created_at", monthStart.toISOString()),
    admin.from("vault_items").select("id", { count: "exact", head: true }).eq("user_id", memberId),
    admin.from("secure_notes").select("id", { count: "exact", head: true }).eq("user_id", memberId),
    admin.from("secure_wallet").select("id", { count: "exact", head: true }).eq("user_id", memberId).neq("type", "bank_account"),
    admin.from("secure_wallet").select("id", { count: "exact", head: true }).eq("user_id", memberId).eq("type", "bank_account"),
    admin.from("secure_credentials").select("id", { count: "exact", head: true }).eq("user_id", memberId),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("user_id", memberId),
    memberDocumentBytes(memberId),
  ]);
  if ([documents, aiEvents, passwords, notes, wallet, banks, credentials, tickets].some((result) => result.error)) {
    throw new Error("ADMIN_MEMBER_USAGE_FAILED");
  }

  const member = data as MemberRow;
  return {
    id: member.user_id,
    email: member.email,
    status: member.status,
    plan: member.plan === "plus" || member.plan === "family" ? "plus" : "free",
    accessRequestId: member.access_request_id,
    approvedAt: member.approved_at,
    activatedAt: member.activated_at,
    createdAt: member.created_at,
    isOwner: isConfiguredAdminUserId(member.user_id),
    usage: {
      documentBytes,
      documents: documents.count ?? 0,
      aiEventsThisMonth: aiEvents.count ?? 0,
      passwords: passwords.count ?? 0,
      notes: notes.count ?? 0,
      walletRecords: wallet.count ?? 0,
      bankAccounts: banks.count ?? 0,
      credentials: credentials.count ?? 0,
      supportTickets: tickets.count ?? 0,
    },
  };
}

export async function sendMemberSetupEmailAdmin(args: { adminId: string; memberId: string }): Promise<
  | { kind: "sent" }
  | { kind: "not_found" }
  | { kind: "protected" }
  | { kind: "conflict" }
  | { kind: "rate_limited" }
  | { kind: "unavailable" }
> {
  const admin = createSupabaseAdminClient();
  const { data: member, error: memberError } = await admin
    .from("app_members")
    .select("user_id,email,status")
    .eq("user_id", args.memberId)
    .maybeSingle();
  if (memberError) throw new Error("ADMIN_MEMBER_SETUP_LOOKUP_FAILED");
  if (!member) return { kind: "not_found" };
  if (args.adminId === member.user_id || isConfiguredAdminUserId(member.user_id)) return { kind: "protected" };
  if (member.status !== "invited") return { kind: "conflict" };

  const { error: resetError } = await admin.auth.resetPasswordForEmail(member.email, {
    redirectTo: `${requiredAppUrl()}/reset-password`,
  });
  if (resetError) {
    if (resetError.status === 429) return { kind: "rate_limited" };
    return { kind: "unavailable" };
  }

  // The reset email has already been sent at this point - a failure to
  // record the audit row must never turn into an operation-level failure,
  // or the admin console tells the admin to retry and a second real email
  // goes out with no way to know the first one already landed.
  const { error: auditError } = await admin.from("admin_audit_log").insert({
    actor_user_id: args.adminId,
    member_user_id: member.user_id,
    action: "setup_email_resent",
    result_code: "SENT",
  });
  if (auditError) console.error("ADMIN_MEMBER_SETUP_AUDIT_FAILED", auditError.message);
  return { kind: "sent" };
}
