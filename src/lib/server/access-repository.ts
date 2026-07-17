import "server-only";

import type { InviteCursor, MemberStatus } from "@/lib/access/types";
import { encodeInviteCursor } from "@/lib/access/validation";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const MEMBER_PAGE_SIZE = 25;

export type MemberAdminDto = {
  id: string;
  email: string;
  status: MemberStatus;
  accessRequestId: string | null;
  approvedAt: string;
  activatedAt: string | null;
  createdAt: string;
};

type MemberRow = {
  user_id: string;
  email: string;
  status: MemberStatus;
  access_request_id: string | null;
  approved_at: string;
  activated_at: string | null;
  created_at: string;
};

function memberDto(row: MemberRow): MemberAdminDto {
  return {
    id: row.user_id,
    email: row.email,
    status: row.status,
    accessRequestId: row.access_request_id,
    approvedAt: row.approved_at,
    activatedAt: row.activated_at,
    createdAt: row.created_at,
  };
}

export async function provisionSelfSignupMember(input: {
  userId: string;
  email: string;
}): Promise<MemberStatus> {
  const email = input.email.trim().toLowerCase();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("provision_self_signup_member", {
    p_user_id: input.userId,
    p_email: email,
    p_now: new Date().toISOString(),
  });
  if (error || !["invited", "active", "suspended", "revoked"].includes(data)) {
    throw new Error("SELF_SIGNUP_PROVISIONING_FAILED");
  }
  return data as MemberStatus;
}

export async function activateInvitedMember(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("activate_invited_member", {
    p_user_id: userId,
    p_now: new Date().toISOString(),
  });
  if (error || data !== "active") throw new Error("MEMBER_ACTIVATION_FAILED");
}

export async function recordActivationAudit(userId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("admin_audit_log").insert({
    action: "onboarding_complete",
    result_code: "ACTIVE",
    actor_user_id: userId,
    member_user_id: userId,
  });
  if (error) throw new Error("ADMIN_AUDIT_WRITE_FAILED");
}

export async function listMembersAdmin(args: {
  status: MemberStatus | null;
  search: string | null;
  cursor: InviteCursor | null;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("app_members")
    .select("user_id,email,status,access_request_id,approved_at,activated_at,created_at")
    .order("created_at", { ascending: false })
    .order("user_id", { ascending: false })
    .limit(MEMBER_PAGE_SIZE);

  if (args.status) query = query.eq("status", args.status);
  if (args.search) query = query.ilike("email", `%${args.search}%`);
  if (args.cursor) {
    query = query.or(
      `created_at.lt.${args.cursor.requestedAt},and(created_at.eq.${args.cursor.requestedAt},user_id.lt.${args.cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("MEMBER_LIST_FAILED");
  const rows = (data ?? []) as MemberRow[];
  const last = rows.at(-1);
  return {
    items: rows.map(memberDto),
    nextCursor: rows.length === MEMBER_PAGE_SIZE && last
      ? encodeInviteCursor({ requestedAt: last.created_at, id: last.user_id })
      : null,
  };
}

export async function mutateMemberStatus(args: {
  adminId: string;
  memberId: string;
  status: "suspended" | "revoked";
}): Promise<
  | { kind: "updated"; member: MemberAdminDto }
  | { kind: "not_found" }
  | { kind: "conflict" }
> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .rpc("mutate_member_status", {
      p_member_id: args.memberId,
      p_admin_id: args.adminId,
      p_status: args.status,
      p_now: new Date().toISOString(),
    });
  if (error) throw new Error("MEMBER_UPDATE_FAILED");
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || row.outcome === "not_found") return { kind: "not_found" };
  if (row.outcome === "conflict") return { kind: "conflict" };
  if (row.outcome !== "updated") throw new Error("MEMBER_UPDATE_FAILED");
  return { kind: "updated", member: memberDto(row as MemberRow) };
}
