import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { periodForPlanId, verifyWebhookSignature } from "@/lib/server/razorpay";

export const runtime = "nodejs";

// Razorpay webhook — the SOLE authority that ever grants or revokes a paid
// plan. Verifies the signature over the raw (unparsed) body, then processes
// idempotently: every event is recorded in payment_events keyed by its event
// id (or a hash of the body as a fallback), and a unique-violation on that
// insert means "already processed" — return 200 without reprocessing.

interface RazorpaySubscriptionEntity {
  id: string;
  status: string;
  current_end?: number;
  plan_id?: string;
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
    plan_id: typeof candidate.plan_id === "string" ? candidate.plan_id : undefined,
  };
}

/** Extracts the payment entity's linked subscription id, if this payment belongs to one. */
function extractPaymentSubscriptionId(payload: unknown): string | null {
  const paymentEntity = (payload as { payload?: { payment?: { entity?: unknown } } })?.payload?.payment?.entity;
  const subEntity = (payload as { payload?: { subscription?: { entity?: unknown } } })?.payload?.subscription?.entity;
  const fromSub = subEntity && typeof subEntity === "object" ? (subEntity as Record<string, unknown>).id : undefined;
  if (typeof fromSub === "string") return fromSub;
  const fromPayment = paymentEntity && typeof paymentEntity === "object" ? (paymentEntity as Record<string, unknown>).subscription_id : undefined;
  return typeof fromPayment === "string" ? fromPayment : null;
}

type PlanAction = "grant" | "revoke" | "preserve";

async function applySubscriptionState(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  subscriptionId: string,
  status: string,
  eventTimestamp: string,
  planAction: PlanAction,
  currentPeriodEnd?: number,
  planId?: string,
) {
  // Any authoritative status update supersedes a stale "payment failed"
  // warning and a completed billing-period change, so clear both here.
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    last_razorpay_event_at: eventTimestamp,
    last_payment_failed_at: null,
  };
  if (currentPeriodEnd) updates.current_period_end = new Date(currentPeriodEnd * 1000).toISOString();
  const resolvedPeriod = planId ? periodForPlanId(planId) : null;
  if (resolvedPeriod) {
    updates.period = resolvedPeriod;
    updates.scheduled_period = null;
  }
  const { data: row, error: updateError } = await admin
    .from("subscriptions")
    .update(updates)
    .eq("razorpay_subscription_id", subscriptionId)
    .or(`last_razorpay_event_at.is.null,last_razorpay_event_at.lte.${eventTimestamp}`)
    .select("user_id,plan")
    .maybeSingle();
  if (updateError) throw updateError;
  if (!row || planAction === "preserve") return;

  const nextPlan = planAction === "grant" ? row.plan : "free";
  const { error: planError } = await admin.from("app_members").update({ plan: nextPlan }).eq("user_id", row.user_id);
  if (planError) throw planError;
}

function eventTimestamp(record: Record<string, unknown>): string {
  const seconds = typeof record.created_at === "number" && Number.isFinite(record.created_at)
    ? record.created_at
    : Math.floor(Date.now() / 1000);
  return new Date(seconds * 1000).toISOString();
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
  const providerEventId = req.headers.get("x-razorpay-event-id");
  const eventId = providerEventId || createHash("sha256").update(rawBody).digest("hex");
  const occurredAt = eventTimestamp(record);

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
      case "subscription.authenticated": {
        const sub = extractSubscription(payload);
        if (sub) await applySubscriptionState(admin, sub.id, "authenticated", occurredAt, "preserve");
        break;
      }
      case "subscription.activated":
      case "subscription.charged": {
        const sub = extractSubscription(payload);
        if (sub) await applySubscriptionState(admin, sub.id, "active", occurredAt, "grant", sub.current_end, sub.plan_id);
        break;
      }
      case "subscription.pending": {
        const sub = extractSubscription(payload);
        if (sub) await applySubscriptionState(admin, sub.id, "pending", occurredAt, "preserve");
        break;
      }
      case "subscription.halted": {
        const sub = extractSubscription(payload);
        if (sub) await applySubscriptionState(admin, sub.id, "halted", occurredAt, "revoke");
        break;
      }
      case "subscription.cancelled": {
        const sub = extractSubscription(payload);
        if (sub) await applySubscriptionState(admin, sub.id, "cancelled", occurredAt, "revoke");
        break;
      }
      case "subscription.completed": {
        const sub = extractSubscription(payload);
        if (sub) await applySubscriptionState(admin, sub.id, "completed", occurredAt, "revoke");
        break;
      }
      case "subscription.expired": {
        const sub = extractSubscription(payload);
        if (sub) await applySubscriptionState(admin, sub.id, "expired", occurredAt, "revoke");
        break;
      }
      case "payment.failed": {
        // Recorded in payment_events above regardless; also surface it to the
        // user if this payment belonged to a subscription, so they see a
        // warning before access silently drops to Free on a later halt.
        const subscriptionId = extractPaymentSubscriptionId(payload);
        if (subscriptionId) {
          const { error } = await admin
            .from("subscriptions")
            .update({ last_payment_failed_at: new Date().toISOString(), last_razorpay_event_at: occurredAt, updated_at: new Date().toISOString() })
            .eq("razorpay_subscription_id", subscriptionId)
            .or(`last_razorpay_event_at.is.null,last_razorpay_event_at.lte.${occurredAt}`);
          if (error) throw error;
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // The idempotency row was already inserted above. If processing failed, a
    // Razorpay retry would otherwise hit the unique constraint and be dismissed
    // as a duplicate — permanently dropping this plan change. Roll the record
    // back so the retry reprocesses. (Best-effort: if the delete itself fails,
    // we're no worse off than before this guard.)
    const { error: rollbackError } = await admin
      .from("payment_events")
      .delete()
      .eq("razorpay_event_id", eventId);
    if (rollbackError) console.error("payment_events rollback failed:", rollbackError);
    console.error(`webhook handling failed for ${eventType}:`, error);
    return NextResponse.json({ error: "Could not process event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
