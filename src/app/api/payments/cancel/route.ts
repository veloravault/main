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

    // The subscription remains active until Razorpay emits
    // subscription.cancelled at the billing-period end. Track the scheduled
    // state locally without revoking paid access early. Clear any pending
    // period change too — it would otherwise show a "switching to X" message
    // alongside "cancelling," which is now moot.
    try {
      const { error: updateError } = await admin
        .from("subscriptions")
        .update({ cancel_at_cycle_end: true, scheduled_period: null, updated_at: new Date().toISOString() })
        .eq("razorpay_subscription_id", row.razorpay_subscription_id);
      if (updateError) throw updateError;
    } catch (dbError) {
      // Razorpay has already scheduled the cancellation regardless of whether
      // this local write lands — don't tell the user to retry (that would
      // call Razorpay's cancel API again); surface the desync for follow-up.
      console.error("cancel subscription: Razorpay cancelled but local DB update failed:", dbError);
    }

    return NextResponse.json({ ok: true, cancel_at_cycle_end: true });
  } catch (error: unknown) {
    console.error("cancel subscription failed:", error);
    return NextResponse.json({ error: "Could not cancel your subscription. Try again." }, { status: 500 });
  }
}
