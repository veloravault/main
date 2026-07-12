import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST() {
  try {
    // Get the current user from the session cookie (server-side)
    const cookieStore = await cookies();
    const serverClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user }, error: userError } = await serverClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Admin client (service role) — needed to delete auth user
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Delete all user data
    await adminClient.from("vault_items").delete().eq("user_id", userId);
    await adminClient.from("secure_notes").delete().eq("user_id", userId);
    await adminClient.from("secure_wallet").delete().eq("user_id", userId);

    // 2. Delete the auth user itself
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
