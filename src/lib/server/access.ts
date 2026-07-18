import "server-only";

import type { User } from "@supabase/supabase-js";
import type { MemberStatus } from "@/lib/access/types";
import { parseAdminUserIds } from "@/lib/access/validation";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { createServerSupabaseClient } from "@/lib/server/supabase";

const MAX_ACCESS_TOKEN_LENGTH = 8_192;
const ADMIN_USER_IDS: ReadonlySet<string> = parseAdminUserIds(process.env.ADMIN_USER_IDS);

export function isConfiguredAdminUserId(userId: string) {
  return ADMIN_USER_IDS.has(userId.toLowerCase());
}

export type AuthorizationErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_ADMIN"
  | "MEMBERSHIP_MISSING"
  | "MEMBERSHIP_INVITED"
  | "MEMBERSHIP_SUSPENDED"
  | "MEMBERSHIP_REVOKED";

export class AuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(readonly code: AuthorizationErrorCode) {
    super(code);
    this.name = "AuthorizationError";
    this.status = code === "UNAUTHENTICATED" ? 401 : 403;
  }
}

type Membership = {
  user_id: string;
  status: MemberStatus;
};

export async function getMembershipForUser(userId: string): Promise<Membership | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("app_members")
    .select("user_id,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Membership | null;
}

function requireActiveMembership(membership: Membership | null) {
  if (!membership) throw new AuthorizationError("MEMBERSHIP_MISSING");
  if (membership.status === "active") return membership;

  switch (membership.status) {
    case "invited":
      throw new AuthorizationError("MEMBERSHIP_INVITED");
    case "suspended":
      throw new AuthorizationError("MEMBERSHIP_SUSPENDED");
    case "revoked":
      throw new AuthorizationError("MEMBERSHIP_REVOKED");
  }
}

export async function requireUser(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new AuthorizationError("UNAUTHENTICATED");
  return data.user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isConfiguredAdminUserId(user.id)) throw new AuthorizationError("NOT_ADMIN");
  return user;
}

export async function requireActiveMember(): Promise<User> {
  const user = await requireUser();
  requireActiveMembership(await getMembershipForUser(user.id));
  return user;
}

export async function requireActiveMemberForToken(accessToken: string): Promise<User> {
  if (!accessToken || accessToken.length > MAX_ACCESS_TOKEN_LENGTH) {
    throw new AuthorizationError("UNAUTHENTICATED");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new AuthorizationError("UNAUTHENTICATED");

  requireActiveMembership(await getMembershipForUser(data.user.id));
  return data.user;
}
