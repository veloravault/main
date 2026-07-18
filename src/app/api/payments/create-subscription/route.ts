import { NextRequest, NextResponse } from "next/server";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import {
  createSubscription,
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
    const customer = await findOrCreateCustomer(user.email, (user.user_metadata?.full_name as string | undefined));
    const subscription = await createSubscription({ planId: razorpayPlanId, customerId: customer.id, notifyEmail: user.email });

    const admin = createSupabaseAdminClient();
    const { error: dbError } = await admin.from("subscriptions").insert({
      user_id: user.id,
      razorpay_subscription_id: subscription.id,
      razorpay_customer_id: customer.id,
      plan,
      period,
      status: "created",
    });
    if (dbError) {
      // No charge occurs (the client never receives subscription.id below to
      // open checkout with), but Razorpay is left holding an orphaned
      // "created" subscription with no local record. Log it with enough
      // detail to cancel by hand until this has a real cleanup job.
      console.error(`create-subscription: DB insert failed for dangling Razorpay subscription ${subscription.id} (user ${user.id}):`, dbError);
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
