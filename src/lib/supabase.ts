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
});
