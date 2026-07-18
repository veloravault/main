import { createClient } from "@supabase/supabase-js";
import { supabase, supabasePublishableKey, supabaseUrl } from "@/lib/supabase";
import { captureAccessTokenForExpectedUser, createCapturedAccessTokenProvider } from "@/lib/vaultKeyOwnership";

export async function getVaultAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Your session has expired. Sign in again to continue.");
  }
  return data.session.access_token;
}

export async function vaultFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const accessToken = await getVaultAccessToken();
  return vaultFetchWithAccessToken(accessToken, input, init);
}

export function vaultFetchWithAccessToken(accessToken: string, input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
}

export async function getExpectedUserAuthorization(expectedUserId: string) {
  const accessToken = await captureAccessTokenForExpectedUser(
    expectedUserId,
    async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session?.access_token ?? null;
    },
    async (accessToken) => {
      const { data, error } = await supabase.auth.getUser(accessToken);
      return error ? null : data.user?.id ?? null;
    },
  );

  const userClient = createClient(supabaseUrl, supabasePublishableKey || "placeholder_key", {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    accessToken: createCapturedAccessTokenProvider(accessToken),
  });
  return { accessToken, userClient };
}
