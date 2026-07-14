import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authenticateRequest, getBearerToken } from "@/lib/server/auth";
import { chunkValues, collectPaginated } from "@/lib/server/pagination";

function serverError() {
  return NextResponse.json({ error: "The account could not be deleted. Try again." }, { status: 500 });
}

async function removeStorageObjects(client: SupabaseClient, bucket: string, paths: string[]) {
  for (const chunk of chunkValues(paths)) {
    const { error } = await client.storage.from(bucket).remove(chunk);
    if (error) throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const canonicalEmail = user.email?.trim().toLowerCase();
    if (!canonicalEmail) return serverError();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) return serverError();

    const admin = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "global");
    if (signOutError) throw signOutError;

    const documents = await collectPaginated(async (offset, limit) => {
      const { data, error } = await admin
        .from("vault_documents")
        .select("storage_path")
        .eq("user_id", user.id)
        .order("id", { ascending: true })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data ?? [];
    });
    await removeStorageObjects(
      admin,
      "vault_documents",
      documents.map((document) => document.storage_path).filter((path): path is string => Boolean(path)),
    );

    const avatarFiles = await collectPaginated(async (offset, limit) => {
      const { data, error } = await admin.storage.from("avatars").list(user.id, {
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      return data ?? [];
    });
    await removeStorageObjects(
      admin,
      "avatars",
      avatarFiles.filter((file) => file.name).map((file) => `${user.id}/${file.name}`),
    );

    for (const table of ["vault_documents", "vault_items", "secure_notes", "secure_wallet"] as const) {
      const { error } = await admin.from(table).delete().eq("user_id", user.id);
      if (error) throw error;
    }

    const { error: accessRequestError } = await admin
      .from("access_requests")
      .delete()
      .eq("auth_user_id", user.id)
      .eq("email", canonicalEmail);
    if (accessRequestError) throw accessRequestError;

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteUserError) throw deleteUserError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account failed:", error);
    return serverError();
  }
}
