import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlanId } from "@/lib/plans";

// Thin wrapper over the Razorpay REST API (no SDK). Auth is HTTP Basic with
// key_id:key_secret. Only the configured Plus plan ids are ever
// sent to Razorpay — the client only ever chooses among a fixed enum, never a
// raw Razorpay plan_id or amount, which closes off price tampering.

export type PaidPlanId = Extract<PlanId, "plus">;
export type BillingPeriod = "monthly" | "yearly";

const API_BASE = "https://api.razorpay.com/v1";

function config() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function razorpayConfigured(): boolean {
  return config() !== null;
}

export function razorpayPublicKeyId(): string {
  const cfg = config();
  if (!cfg) throw new Error("RAZORPAY_NOT_CONFIGURED");
  return cfg.keyId;
}

function planIdFor(plan: PaidPlanId, period: BillingPeriod): string {
  const envKey = `RAZORPAY_PLAN_${plan.toUpperCase()}_${period.toUpperCase()}` as const;
  const planId = process.env[envKey];
  if (!planId) throw new Error(`Missing env ${envKey}`);
  return planId;
}

/** Reverse lookup: which billing period does this Razorpay plan_id represent? */
function periodForPlanId(planId: string): BillingPeriod | null {
  if (planId === process.env.RAZORPAY_PLAN_PLUS_MONTHLY) return "monthly";
  if (planId === process.env.RAZORPAY_PLAN_PLUS_YEARLY) return "yearly";
  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = config();
  if (!cfg) throw new Error("RAZORPAY_NOT_CONFIGURED");
  const auth = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString("base64");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.error?.description === "string" ? body.error.description : `Razorpay request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

interface RazorpayCustomer {
  id: string;
}

/** Finds an existing Razorpay customer by email, or creates one. */
export async function findOrCreateCustomer(email: string, name?: string): Promise<RazorpayCustomer> {
  const existing = await request<{ items: RazorpayCustomer[] }>(`/customers?count=1&email=${encodeURIComponent(email)}`);
  if (existing.items.length > 0) return existing.items[0];
  return request<RazorpayCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({ name: name || email, email, fail_existing: 0 }),
  });
}

export interface RazorpaySubscription {
  id: string;
  status: string;
  plan_id: string;
}

export async function fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  return request<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

/**
 * Creates a long-running subscription. Razorpay requires a bounded cycle count
 * and caps duration at 100 years, so the caller supplies a period-safe count.
 */
export async function createSubscription(params: {
  planId: string;
  customerId: string;
  notifyEmail: string;
  totalCount: number;
}): Promise<RazorpaySubscription> {
  return request<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: params.planId,
      customer_id: params.customerId,
      total_count: params.totalCount,
      customer_notify: true,
      notes: { email: params.notifyEmail },
    }),
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await request(`/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: true }),
  });
}

/** Cancels an unfinished Checkout subscription so another plan can be selected. */
export async function cancelSubscriptionImmediately(subscriptionId: string): Promise<void> {
  await request(`/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: false }),
  });
}

/**
 * Changes a subscription's plan (used here for billing-period changes only —
 * monthly <-> yearly on the same Plus tier). schedule_change_at: "cycle_end"
 * keeps the current, already-paid-for cycle untouched and applies the new
 * plan starting the next renewal, so there is nothing to prorate.
 */
export async function updateSubscriptionPlan(subscriptionId: string, planId: string): Promise<void> {
  await request(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      plan_id: planId,
      schedule_change_at: "cycle_end",
      customer_notify: true,
    }),
  });
}

export { planIdFor, periodForPlanId };

/** Verifies a Checkout success signature: HMAC_SHA256(payment_id|subscription_id, key_secret). */
export function verifyCheckoutSignature(paymentId: string, subscriptionId: string, signature: string): boolean {
  const cfg = config();
  if (!cfg) return false;
  const expected = createHmac("sha256", cfg.keySecret).update(`${paymentId}|${subscriptionId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verifies a webhook signature over the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

function safeEqualHex(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
