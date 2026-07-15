import { NextResponse } from "next/server";
import { reconcileConfirmedInvite } from "@/lib/server/access-repository";
import { assertSameOrigin } from "@/lib/server/request-security";
import { createServerSupabaseClient } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (request.body !== null) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) {
      return NextResponse.json({ error: "INVITATION_SESSION_REQUIRED" }, { status: 401 });
    }

    const status = await reconcileConfirmedInvite({
      userId: data.user.id,
      email: data.user.email,
    });
    if (status === "invited") return NextResponse.json({ next: "/onboarding" });
    if (status === "active") return NextResponse.json({ next: "/vault" });

    await supabase.auth.signOut();
    return NextResponse.json({ error: "INVITATION_UNAVAILABLE" }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "INVITATION_UNAVAILABLE" }, { status: 400 });
  }
}
