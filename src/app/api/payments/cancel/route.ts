import { NextRequest, NextResponse } from "next/server";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { cancelSubscription, razorpayConfigured } from "@/lib/server/razorpay";

export async function POST(req: NextRequest) {
  try {
    if (!razorpayConfigured()) {
      return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    }

    const user = await authenticateActiveMemberRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("subscriptions")
      .select("razorpay_subscription_id,status")
      .eq("user_id", user.id)
      .in("status", ["created", "authenticated", "active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!row) return NextResponse.json({ error: "No active subscription to cancel." }, { status: 404 });

    await cancelSubscription(row.razorpay_subscription_id);

    // Best-effort local update; the webhook (subscription.cancelled) is the
    // authoritative path that reverts app_members.plan.
    await admin.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("razorpay_subscription_id", row.razorpay_subscription_id);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("cancel subscription failed:", error);
    return NextResponse.json({ error: "Could not cancel your subscription. Try again." }, { status: 500 });
  }
}
