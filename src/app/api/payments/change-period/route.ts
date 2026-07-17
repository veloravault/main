import { NextRequest, NextResponse } from "next/server";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { planIdFor, razorpayConfigured, updateSubscriptionPlan, type BillingPeriod, type PaidPlanId } from "@/lib/server/razorpay";
import { InvalidJsonBodyError, PayloadTooLargeError, readBoundedJson } from "@/lib/server/requestBody";

const MAX_BODY_BYTES = 256;
const PERIODS = new Set<BillingPeriod>(["monthly", "yearly"]);

export async function POST(req: NextRequest) {
  try {
    if (!razorpayConfigured()) {
      return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    }

    const user = await authenticateActiveMemberRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await readBoundedJson(req, MAX_BODY_BYTES);
    const targetPeriod = body.period as BillingPeriod;
    if (!PERIODS.has(targetPeriod)) {
      return NextResponse.json({ error: "Invalid billing period." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("subscriptions")
      .select("razorpay_subscription_id,plan,period,status,cancel_at_cycle_end,scheduled_period")
      .eq("user_id", user.id)
      .in("status", ["created", "authenticated", "active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!row) return NextResponse.json({ error: "No active subscription to change." }, { status: 404 });
    if (row.cancel_at_cycle_end) {
      return NextResponse.json({ error: "This subscription is scheduled to cancel — resubscribe instead of changing its period." }, { status: 409 });
    }
    if (row.period === targetPeriod && !row.scheduled_period) {
      return NextResponse.json({ error: `Already billed ${targetPeriod}.` }, { status: 409 });
    }

    const razorpayPlanId = planIdFor(row.plan as PaidPlanId, targetPeriod);
    await updateSubscriptionPlan(row.razorpay_subscription_id, razorpayPlanId);

    const { error: updateError } = await admin
      .from("subscriptions")
      .update({ scheduled_period: targetPeriod, updated_at: new Date().toISOString() })
      .eq("razorpay_subscription_id", row.razorpay_subscription_id);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, scheduled_period: targetPeriod });
  } catch (error: unknown) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    console.error("change-period failed:", error);
    return NextResponse.json({ error: "Could not change your billing period. Try again." }, { status: 500 });
  }
}
