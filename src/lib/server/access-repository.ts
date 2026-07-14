import "server-only";

import type {
  AccessRequestInput,
  AccessRequestStatus,
  InviteCursor,
  MemberStatus,
} from "@/lib/access/types";
import type { AuditEntry, ClaimResult, InvitationErrorCode } from "@/lib/access/approval";
import { encodeInviteCursor } from "@/lib/access/validation";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const ACCESS_REQUEST_WINDOW_MS = 15 * 60 * 1_000;
export const ACCESS_REQUEST_PAGE_SIZE = 25;
export const MEMBER_PAGE_SIZE = 25;
const INVITATION_LEASE_MS = 10 * 60 * 1_000;
const SAFE_INVITATION_ERROR_CODES: ReadonlySet<string> = new Set<InvitationErrorCode>([
  "DELIVERY_FAILED",
  "ALREADY_INVITED",
  "RATE_LIMITED",
  "CONFIGURATION_ERROR",
]);

export type AccessRequestAdminDto = {
  id: string;
  fullName: string;
  email: string;
  status: AccessRequestStatus;
  requestedAt: string;
  updatedAt: string;
  inviteStartedAt: string | null;
  invitedAt: string | null;
  inviteAttempts: number;
  lastErrorCode: InvitationErrorCode | null;
};

export type MemberAdminDto = {
  id: string;
  email: string;
  status: MemberStatus;
  accessRequestId: string | null;
  approvedAt: string;
  activatedAt: string | null;
  createdAt: string;
};

type AccessRequestRow = {
  id: string;
  full_name: string;
  email: string;
  status: AccessRequestStatus;
  requested_at: string;
  updated_at: string;
  invite_started_at: string | null;
  invited_at: string | null;
  invite_attempts: number;
  last_error_code: string | null;
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

export function accessRequestWindowStart(now: Date) {
  return new Date(Math.floor(now.getTime() / ACCESS_REQUEST_WINDOW_MS) * ACCESS_REQUEST_WINDOW_MS).toISOString();
}

export async function consumeAccessRequestRateLimit(fingerprint: string, windowStart: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_access_request_rate_limit", {
    p_fingerprint: fingerprint,
    p_window_started_at: windowStart,
    p_limit: 5,
  });

  if (error || typeof data !== "boolean") throw new Error("ACCESS_REQUEST_RATE_LIMIT_FAILED");
  return data;
}

export async function insertAccessRequest(input: AccessRequestInput) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("access_requests")
    .upsert(
      { full_name: input.fullName, email: input.email },
      { onConflict: "email", ignoreDuplicates: true },
    );

  if (error) throw new Error("ACCESS_REQUEST_INSERT_FAILED");
}

export async function cleanupExpiredRateLimits(cutoff: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("access_request_rate_limits")
    .delete()
    .lt("window_started_at", cutoff);

  if (error) throw new Error("ACCESS_REQUEST_CLEANUP_FAILED");
}

function safeInvitationErrorCode(code: string | null): InvitationErrorCode | null {
  return code && SAFE_INVITATION_ERROR_CODES.has(code) ? code as InvitationErrorCode : null;
}

function accessRequestDto(row: AccessRequestRow): AccessRequestAdminDto {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    status: row.status,
    requestedAt: row.requested_at,
    updatedAt: row.updated_at,
    inviteStartedAt: row.invite_started_at,
    invitedAt: row.invited_at,
    inviteAttempts: row.invite_attempts,
    lastErrorCode: safeInvitationErrorCode(row.last_error_code),
  };
}

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

export async function claimAccessRequestInvitation(
  requestId: string,
  adminId: string,
  now: string,
): Promise<ClaimResult> {
  const admin = createSupabaseAdminClient();
  const staleBefore = new Date(Date.parse(now) - INVITATION_LEASE_MS).toISOString();
  const { data, error } = await admin.rpc("claim_access_request_invitation", {
    p_request_id: requestId,
    p_admin_id: adminId,
    p_now: now,
    p_stale_before: staleBefore,
  });

  if (error) throw new Error("INVITATION_CLAIM_FAILED");
  const row = Array.isArray(data) ? data[0] : null;
  if (
    row
    && typeof row.id === "string"
    && typeof row.email === "string"
    && typeof row.full_name === "string"
    && Number.isSafeInteger(row.attempt)
    && row.attempt > 0
  ) {
    return {
      kind: "claimed",
      request: {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        attempt: row.attempt,
      },
    };
  }

  const { data: existing, error: lookupError } = await admin
    .from("access_requests")
    .select("id,status")
    .eq("id", requestId)
    .maybeSingle();

  if (lookupError) throw new Error("INVITATION_CLAIM_LOOKUP_FAILED");
  return existing?.status === "inviting"
    ? { kind: "already_processing" }
    : { kind: "not_found" };
}

export async function completeAccessRequestInvitation(
  requestId: string,
  adminId: string,
  userId: string,
  attempt: number,
  now: string,
) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("complete_access_request_invitation", {
    p_request_id: requestId,
    p_admin_id: adminId,
    p_user_id: userId,
    p_attempt: attempt,
    p_now: now,
  });
  if (error) throw new Error("INVITATION_COMPLETION_FAILED");
}

export async function markAccessRequestInvitationFailed(
  requestId: string,
  adminId: string,
  code: string,
  attempt: number,
  now: string,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("access_requests")
    .update({
      status: "invite_failed",
      reviewed_by: adminId,
      last_error_code: code,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "inviting")
    .eq("invite_attempts", attempt)
    .select("id")
    .maybeSingle();

  if (error || !data) throw new Error("INVITATION_FAILURE_PERSIST_FAILED");
}

export async function recordInviteAudit(entry: AuditEntry) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("admin_audit_log").insert({
    action: entry.action,
    result_code: entry.resultCode,
    access_request_id: entry.requestId,
    actor_user_id: entry.adminId,
    member_user_id: entry.memberUserId ?? null,
  });
  if (error) throw new Error("ADMIN_AUDIT_WRITE_FAILED");
}

function applyAccessCursor<T extends {
  or: (filters: string) => T;
}>(query: T, cursor: InviteCursor | null) {
  if (!cursor) return query;
  return query.or(
    `requested_at.lt.${cursor.requestedAt},and(requested_at.eq.${cursor.requestedAt},id.lt.${cursor.id})`,
  );
}

function quotePostgrestFilterValue(value: string) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}

export async function listAccessRequestsAdmin(args: {
  status: AccessRequestStatus | null;
  search: string | null;
  cursor: InviteCursor | null;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("access_requests")
    .select("id,full_name,email,status,requested_at,updated_at,invite_started_at,invited_at,invite_attempts,last_error_code")
    .order("requested_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ACCESS_REQUEST_PAGE_SIZE);

  if (args.status) query = query.eq("status", args.status);
  if (args.search) {
    const searchLiteral = quotePostgrestFilterValue(args.search);
    query = query.or(`full_name.ilike.${searchLiteral},email.ilike.${searchLiteral}`);
  }
  query = applyAccessCursor(query, args.cursor);

  const { data, error } = await query;
  if (error) throw new Error("ACCESS_REQUEST_LIST_FAILED");
  const rows = (data ?? []) as AccessRequestRow[];
  const last = rows.at(-1);
  return {
    items: rows.map(accessRequestDto),
    nextCursor: rows.length === ACCESS_REQUEST_PAGE_SIZE && last
      ? encodeInviteCursor({ requestedAt: last.requested_at, id: last.id })
      : null,
  };
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

export async function updateMemberStatus(memberId: string, status: "suspended" | "revoked") {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("app_members")
    .update({ status })
    .eq("user_id", memberId)
    .select("user_id,email,status,access_request_id,approved_at,activated_at,created_at")
    .maybeSingle();
  if (error) throw new Error("MEMBER_UPDATE_FAILED");
  return data ? memberDto(data as MemberRow) : null;
}

export async function recordMemberAudit(args: {
  adminId: string;
  memberId: string;
  status: "suspended" | "revoked";
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("admin_audit_log").insert({
    action: args.status === "suspended" ? "suspend" : "revoke",
    result_code: args.status.toUpperCase(),
    actor_user_id: args.adminId,
    member_user_id: args.memberId,
  });
  if (error) throw new Error("ADMIN_AUDIT_WRITE_FAILED");
}
