import { NextRequest, NextResponse } from "next/server";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { verifyCheckoutSignature } from "@/lib/server/razorpay";
import { InvalidJsonBodyError, PayloadTooLargeError, readBoundedJson } from "@/lib/server/requestBody";

const MAX_BODY_BYTES = 2_048;

// Verifies the Checkout success signature for immediate UI feedback only.
// This route NEVER grants a plan — the webhook is the sole authority for
// that, since a client-reported "success" is not proof a server should trust.
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateActiveMemberRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await readBoundedJson(req, MAX_BODY_BYTES);
    const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const subscriptionId = typeof body.razorpay_subscription_id === "string" ? body.razorpay_subscription_id : "";
    const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";

    if (!paymentId || !subscriptionId || !signature) {
      return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
    }
    if (!verifyCheckoutSignature(paymentId, subscriptionId, signature)) {
      return NextResponse.json({ error: "Payment signature could not be verified." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: subscriptionRow, error } = await admin
      .from("subscriptions")
      .select("status,plan,period")
      .eq("user_id", user.id)
      .eq("razorpay_subscription_id", subscriptionId)
      .maybeSingle();
    if (error) throw error;
    if (!subscriptionRow) return NextResponse.json({ error: "Subscription not found." }, { status: 404 });

    return NextResponse.json({ verified: true, status: subscriptionRow.status });
  } catch (error: unknown) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    console.error("payment verify failed:", error);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }
}
