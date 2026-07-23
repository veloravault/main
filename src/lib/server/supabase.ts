import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) throw new Error("SUPABASE_PUBLIC_NOT_CONFIGURED");

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    // Default cookie options set no `secure` attribute at all - explicit here
    // rather than relying solely on HSTS to keep the session cookie off any
    // plaintext connection. Off in dev since localhost is typically plain HTTP.
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies but cannot write them. Proxy
          // performs refreshes; Route Handlers and Server Functions can write.
        }
      },
    },
  });
}
