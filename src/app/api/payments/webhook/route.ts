import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { verifyWebhookSignature } from "@/lib/server/razorpay";

// Razorpay webhook — the SOLE authority that ever grants or revokes a paid
// plan. Verifies the signature over the raw (unparsed) body, then processes
// idempotently: every event is recorded in payment_events keyed by its event
// id (or a hash of the body as a fallback), and a unique-violation on that
// insert means "already processed" — return 200 without reprocessing.

interface RazorpaySubscriptionEntity {
  id: string;
  status: string;
  current_end?: number;
}

function extractSubscription(payload: unknown): RazorpaySubscriptionEntity | null {
  const entity = (payload as { payload?: { subscription?: { entity?: unknown } } })?.payload?.subscription?.entity;
  if (!entity || typeof entity !== "object") return null;
  const candidate = entity as Record<string, unknown>;
  if (typeof candidate.id !== "string") return null;
  return {
    id: candidate.id,
    status: typeof candidate.status === "string" ? candidate.status : "",
    current_end: typeof candidate.current_end === "number" ? candidate.current_end : undefined,
  };
}

async function revertPlanForSubscription(admin: ReturnType<typeof createSupabaseAdminClient>, subscriptionId: string, status: string, currentPeriodEnd?: number) {
  const { data: row, error } = await admin
    .from("subscriptions")
    .select("user_id,plan")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return; // Unknown subscription (e.g. from a different environment's test data) — nothing to do.

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (currentPeriodEnd) updates.current_period_end = new Date(currentPeriodEnd * 1000).toISOString();
  const { error: updateError } = await admin.from("subscriptions").update(updates).eq("razorpay_subscription_id", subscriptionId);
  if (updateError) throw updateError;

  const nextPlan = status === "active" ? row.plan : "free";
  const { error: planError } = await admin.from("app_members").update({ plan: nextPlan }).eq("user_id", row.user_id);
  if (planError) throw planError;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const record = payload as Record<string, unknown>;
  const eventType = typeof record.event === "string" ? record.event : "unknown";
  const eventId = typeof record.id === "string" && record.id ? record.id : createHash("sha256").update(rawBody).digest("hex");

  const admin = createSupabaseAdminClient();

  const { error: insertError } = await admin
    .from("payment_events")
    .insert({ razorpay_event_id: eventId, event_type: eventType, payload: record });
  if (insertError) {
    if (insertError.code === "23505") {
      // Already processed this exact event — Razorpay retries deliveries.
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("payment_events insert failed:", insertError);
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  try {
    switch (eventType) {
      case "subscription.activated":
      case "subscription.charged": {
        const sub = extractSubscription(payload);
        if (sub) await revertPlanForSubscription(admin, sub.id, "active", sub.current_end);
        break;
      }
      case "subscription.pending": {
        const sub = extractSubscription(payload);
        if (sub) {
          const { error } = await admin.from("subscriptions").update({ status: "pending", updated_at: new Date().toISOString() }).eq("razorpay_subscription_id", sub.id);
          if (error) throw error;
        }
        break;
      }
      case "subscription.halted": {
        const sub = extractSubscription(payload);
        if (sub) await revertPlanForSubscription(admin, sub.id, "halted");
        break;
      }
      case "subscription.cancelled": {
        const sub = extractSubscription(payload);
        if (sub) await revertPlanForSubscription(admin, sub.id, "cancelled");
        break;
      }
      case "subscription.completed": {
        const sub = extractSubscription(payload);
        if (sub) await revertPlanForSubscription(admin, sub.id, "completed");
        break;
      }
      case "payment.failed":
        // Logged via payment_events above; Razorpay's own retry schedule applies.
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`webhook handling failed for ${eventType}:`, error);
    return NextResponse.json({ error: "Could not process event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
