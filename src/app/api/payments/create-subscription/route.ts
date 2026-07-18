import { NextRequest, NextResponse } from "next/server";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import {
  cancelSubscriptionImmediately,
  createSubscription,
  fetchSubscription,
  findOrCreateCustomer,
  planIdFor,
  razorpayConfigured,
  razorpayPublicKeyId,
  type BillingPeriod,
  type PaidPlanId,
} from "@/lib/server/razorpay";
import { InvalidJsonBodyError, PayloadTooLargeError, readBoundedJson } from "@/lib/server/requestBody";

const MAX_BODY_BYTES = 512;
const PAID_PLANS = new Set<PaidPlanId>(["plus"]);
const PERIODS = new Set<BillingPeriod>(["monthly", "yearly"]);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!razorpayConfigured()) {
      return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    }

    const user = await authenticateActiveMemberRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.email) return NextResponse.json({ error: "Your account has no email on file." }, { status: 400 });

    const body = await readBoundedJson(req, MAX_BODY_BYTES);
    const plan = body.plan as PaidPlanId;
    const period = body.period as BillingPeriod;
    if (!PAID_PLANS.has(plan) || !PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid plan or period." }, { status: 400 });
    }

    const razorpayPlanId = planIdFor(plan, period);
    const admin = createSupabaseAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("subscriptions")
      .select("razorpay_subscription_id,status,plan,period")
      .eq("user_id", user.id)
      .in("status", ["created", "authenticated", "active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.status === "created") {
      const remote = await fetchSubscription(existing.razorpay_subscription_id);
      if (remote.status === "created" && remote.plan_id === razorpayPlanId) {
        return NextResponse.json({ subscriptionId: remote.id, keyId: razorpayPublicKeyId(), reused: true });
      }

      if (remote.status === "created") await cancelSubscriptionImmediately(remote.id);
      const nextStatus = remote.status === "created" ? "cancelled" : remote.status;
      const { error: syncError } = await admin
        .from("subscriptions")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("razorpay_subscription_id", remote.id);
      if (syncError) throw syncError;

      if (["authenticated", "active", "pending"].includes(remote.status)) {
        return NextResponse.json({ error: "You already have a subscription in progress." }, { status: 409 });
      }
    } else if (existing) {
      return NextResponse.json({ error: "You already have a subscription in progress." }, { status: 409 });
    }

    const customer = await findOrCreateCustomer(user.email, (user.user_metadata?.full_name as string | undefined));
    const subscription = await createSubscription({
      planId: razorpayPlanId,
      customerId: customer.id,
      notifyEmail: user.email,
      totalCount: period === "monthly" ? 120 : 100,
    });

    const { error: dbError } = await admin.from("subscriptions").insert({
      user_id: user.id,
      razorpay_subscription_id: subscription.id,
      razorpay_customer_id: customer.id,
      plan,
      period,
      status: "created",
    });
    if (dbError) {
      // The client never receives this id, so no charge can happen. Cancel the
      // remote object immediately to avoid accumulating orphan subscriptions.
      try {
        await cancelSubscriptionImmediately(subscription.id);
      } catch (cleanupError) {
        console.error(`create-subscription: orphan cleanup failed for ${subscription.id}:`, cleanupError);
      }
      throw dbError;
    }

    return NextResponse.json({ subscriptionId: subscription.id, keyId: razorpayPublicKeyId() });
  } catch (error: unknown) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    console.error("create-subscription failed:", error);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 500 });
  }
}
