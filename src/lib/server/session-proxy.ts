import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function refreshSupabaseSession(request: NextRequest, requestHeaders: Headers) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return NextResponse.next({ request: { headers: requestHeaders } });

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(url, publishableKey, {
    // Default cookie options set no `secure` attribute at all - explicit here
    // rather than relying solely on HSTS to keep the session cookie off any
    // plaintext connection. Off in dev since localhost is typically plain HTTP.
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
