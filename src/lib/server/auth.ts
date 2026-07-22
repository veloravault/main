import "server-only";

import type { User } from "@supabase/supabase-js";
import { requireActiveMemberForToken } from "@/lib/server/access";
import { createServerSupabaseClient } from "@/lib/server/supabase";

const MAX_ACCESS_TOKEN_LENGTH = 8_192;

export async function requireAuthenticatedUser(accessToken: string): Promise<User> {
  if (!accessToken || accessToken.length > MAX_ACCESS_TOKEN_LENGTH) {
    throw new Error("Unauthorized");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token && token.length <= MAX_ACCESS_TOKEN_LENGTH ? token : null;
}

export async function authenticateRequest(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    return await requireAuthenticatedUser(token);
  } catch {
    return null;
  }
}

export async function authenticateActiveMemberRequest(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    return await requireActiveMemberForToken(token);
  } catch {
    return null;
  }
}

/**
 * Lightweight signed-in check for public marketing pages, used only to pick
 * the right initial CTA copy (e.g. "Open vault" vs "Sign up") server-side so
 * it renders correctly on first paint instead of flashing the signed-out
 * state and swapping after the client re-checks - a real CLS source. Not a
 * security gate; real page access still goes through requireActiveMember /
 * requireAdmin.
 */
export async function getInitialSignedIn(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user != null;
  } catch {
    return false;
  }
}
