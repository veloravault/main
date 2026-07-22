// Carries a chosen paid plan across the signup -> email confirmation ->
// onboarding boundary, so a new user who picked Plus on the pricing
// page lands straight in checkout instead of hunting through Settings
// afterward. A cookie (not sessionStorage) because confirming an email
// commonly opens a new tab/window - sessionStorage wouldn't survive that,
// but a Lax same-site cookie does since it's still the same browser.

import type { PlanId } from "@/lib/plans";

export type PlanIntentPeriod = "monthly" | "yearly";
export type PlanIntentPlan = Extract<PlanId, "plus">;

export interface PlanIntent {
  plan: PlanIntentPlan;
  period: PlanIntentPeriod;
}

const COOKIE_NAME = "velora_plan_intent";
const MAX_AGE_SECONDS = 60 * 60; // 1 hour - plenty for a signup + email-confirm round trip.

function isPlanIntentPlan(value: string): value is PlanIntentPlan {
  return value === "plus";
}

function isPlanIntentPeriod(value: string): value is PlanIntentPeriod {
  return value === "monthly" || value === "yearly";
}

export function setPlanIntentCookie(intent: PlanIntent): void {
  document.cookie = `${COOKIE_NAME}=${intent.plan}:${intent.period}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function readPlanIntentCookie(): PlanIntent | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const [plan, period] = decodeURIComponent(match[1]).split(":");
  if (!plan || !period || !isPlanIntentPlan(plan) || !isPlanIntentPeriod(period)) return null;
  return { plan, period };
}

export function clearPlanIntentCookie(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}
