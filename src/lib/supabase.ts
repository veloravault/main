import { createBrowserClient } from "@supabase/ssr";

let configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
if (!configuredSupabaseUrl.startsWith("http://") && !configuredSupabaseUrl.startsWith("https://")) {
  configuredSupabaseUrl = "https://placeholder.supabase.co";
}
export const supabaseUrl = configuredSupabaseUrl;
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createBrowserClient(supabaseUrl, supabasePublishableKey || "placeholder_key", {
  auth: { detectSessionInUrl: false },
  // Default cookie options set no `secure` attribute at all - explicit here
  // rather than relying solely on HSTS to keep the session cookie off any
  // plaintext connection. Off in dev since localhost is typically plain HTTP.
  cookieOptions: { secure: process.env.NODE_ENV === "production" },
});
