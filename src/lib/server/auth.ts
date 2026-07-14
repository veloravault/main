import "server-only";

import type { User } from "@supabase/supabase-js";
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
