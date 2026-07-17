import "server-only";

import type { InviteCursor, MemberStatus } from "@/lib/access/types";
import type { PlanId } from "@/lib/plans";
import { encodeInviteCursor } from "@/lib/access/validation";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const MEMBER_PAGE_SIZE = 25;
export const ADMIN_ACTIVITY_PAGE_SIZE = 30;

export type MemberAdminDto = {
  id: string;
  email: string;
  status: MemberStatus;
  plan: PlanId;
  accessRequestId: string | null;
  approvedAt: string;
  activatedAt: string | null;
  createdAt: string;
};

type MemberRow = {
  user_id: string;
  email: string;
  status: MemberStatus;
  plan?: string;
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
    plan: row.plan === "plus" || row.plan === "family" ? "plus" : "free",
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
    .select("user_id,email,status,plan,access_request_id,approved_at,activated_at,created_at")
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

type AdminActivityCursor = { createdAt: string; id: number };
const ADMIN_ACTIVITY_CURSOR = /^[A-Za-z0-9_-]+$/;
const ADMIN_ACTIVITY_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

type AdminActivityRow = {
  id: number;
  action: string;
  result_code: string;
  actor_user_id: string | null;
  member_user_id: string | null;
  created_at: string;
};

export type AdminActivityDto = {
  id: string;
  action: string;
  resultCode: string;
  actorUserId: string | null;
  memberUserId: string | null;
  memberEmail: string | null;
  createdAt: string;
};

function encodeAdminActivityCursor(cursor: AdminActivityCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function parseAdminActivityCursor(value: string | null): AdminActivityCursor | null {
  if (!value || value.length > 300 || !ADMIN_ACTIVITY_CURSOR.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AdminActivityCursor>;
    if (
      typeof parsed.createdAt !== "string"
      || !ADMIN_ACTIVITY_TIMESTAMP.test(parsed.createdAt)
      || !Number.isFinite(Date.parse(parsed.createdAt))
      || typeof parsed.id !== "number"
      || !Number.isSafeInteger(parsed.id)
      || parsed.id < 1
    ) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export async function listAdminActivity(args: { cursor: AdminActivityCursor | null }) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("admin_audit_log")
    .select("id,action,result_code,actor_user_id,member_user_id,created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ADMIN_ACTIVITY_PAGE_SIZE);

  if (args.cursor) {
    query = query.or(
      `created_at.lt.${args.cursor.createdAt},and(created_at.eq.${args.cursor.createdAt},id.lt.${args.cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("ADMIN_ACTIVITY_LIST_FAILED");
  const rows = (data ?? []) as AdminActivityRow[];
  const memberIds = [...new Set(rows.flatMap((row) => row.member_user_id ? [row.member_user_id] : []))];
  const emailById = new Map<string, string>();

  if (memberIds.length > 0) {
    const { data: members, error: memberError } = await admin
      .from("app_members")
      .select("user_id,email")
      .in("user_id", memberIds);
    if (memberError) throw new Error("ADMIN_ACTIVITY_MEMBERS_FAILED");
    for (const member of members ?? []) emailById.set(member.user_id, member.email);
  }

  const last = rows.at(-1);
  return {
    items: rows.map((row): AdminActivityDto => ({
      id: String(row.id),
      action: row.action,
      resultCode: row.result_code,
      actorUserId: row.actor_user_id,
      memberUserId: row.member_user_id,
      memberEmail: row.member_user_id ? emailById.get(row.member_user_id) ?? null : null,
      createdAt: row.created_at,
    })),
    nextCursor: rows.length === ADMIN_ACTIVITY_PAGE_SIZE && last
      ? encodeAdminActivityCursor({ createdAt: last.created_at, id: last.id })
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
  const { data: updatedMember, error: memberError } = await admin
    .from("app_members")
    .select("user_id,email,status,plan,access_request_id,approved_at,activated_at,created_at")
    .eq("user_id", args.memberId)
    .single();
  if (memberError || !updatedMember) throw new Error("MEMBER_UPDATE_READ_FAILED");
  return { kind: "updated", member: memberDto(updatedMember as MemberRow) };
}
