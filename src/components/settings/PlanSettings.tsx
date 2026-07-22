"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { useToast } from "@/components/Toast";
import { vaultFetch } from "@/lib/authToken";
import { openSubscriptionCheckout } from "@/lib/razorpayCheckout";
import { PLAN_IDS, formatBytes, isPlanId, type PlanId } from "@/lib/plans";
import { PRICING_TIERS } from "@/components/dreelio/pricing-data";
import type { SettingsAutoUpgrade } from "@/components/settings/settings-types";

type BillingPeriod = "monthly" | "yearly";
type PaidPlanId = Extract<PlanId, "plus">;

interface AccountUsage {
  plan: PlanId;
  storage_bytes: number;
  storage_limit: number;
  ai_used: number;
  ai_limit: number | null;
  wallet_count: number;
  wallet_limit: number | null;
}

interface SubscriptionRow {
  status: string;
  plan: PaidPlanId;
  period: BillingPeriod;
  current_period_end: string | null;
  cancel_at_cycle_end: boolean;
  scheduled_period: BillingPeriod | null;
  last_payment_failed_at: string | null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["created", "authenticated", "active", "pending"]);

const TAGLINE: Record<PlanId, string> = {
  free: PRICING_TIERS[0].tagline,
  plus: PRICING_TIERS[1].tagline,
};

function priceFor(plan: PlanId, period: BillingPeriod): string {
  if (plan === "free") return "₹0";
  const tier = PRICING_TIERS[1];
  return period === "monthly" ? `₹${tier.monthlyPrice}/mo` : `₹${tier.annualPrice}/yr`;
}

function Meter({ label, value, max, caption, locked }: { label: string; value: number; max: number | null; caption: string; locked?: boolean }) {
  const ratio = max && max > 0 ? Math.min(value / max, 1) : locked ? 0 : 1;
  const danger = max != null && value >= max;
  return (
    <div className="settings-plan-meter">
      <div className="settings-plan-meter-head">
        <span>{label}</span>
        <strong>{caption}</strong>
      </div>
      <div className={`settings-plan-bar ${locked ? "is-locked" : ""} ${danger ? "is-full" : ""}`} role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>
    </div>
  );
}

async function fetchUsage(): Promise<AccountUsage> {
  const { data, error: rpcError } = await supabase.rpc("get_account_usage");
  if (rpcError) throw new Error(rpcError.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !isPlanId(row.plan)) throw new Error("Your plan could not be loaded.");
  return {
    plan: row.plan,
    storage_bytes: Number(row.storage_bytes ?? 0),
    storage_limit: Number(row.storage_limit ?? 0),
    ai_used: Number(row.ai_used ?? 0),
    ai_limit: row.ai_limit == null ? null : Number(row.ai_limit),
    wallet_count: Number(row.wallet_count ?? 0),
    wallet_limit: row.wallet_limit == null ? null : Number(row.wallet_limit),
  };
}

async function fetchLatestSubscription(): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status,plan,period,current_period_end,cancel_at_cycle_end,scheduled_period,last_payment_failed_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as SubscriptionRow | null;
}

async function loadAll(): Promise<[AccountUsage, SubscriptionRow | null]> {
  return Promise.all([fetchUsage(), fetchLatestSubscription()]);
}

export function PlanSettings({ autoUpgrade }: { autoUpgrade?: SettingsAutoUpgrade | null }) {
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>(autoUpgrade?.period ?? "monthly");
  const [processingPlan, setProcessingPlan] = useState<PaidPlanId | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [changingPeriod, setChangingPeriod] = useState(false);
  const toast = useToast();
  const autoUpgradeTriggered = useRef(false);
  const periodSynced = useRef(false);

  useEffect(() => {
    let active = true;
    loadAll()
      .then(([nextUsage, nextSub]) => { if (active) { setUsage(nextUsage); setSubscription(nextSub); setError(null); setLoading(false); } })
      .catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Your plan could not be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  // Once an existing paid subscription loads, default the billing-period
  // toggle to what the subscriber is actually billed, not always "monthly" -   // otherwise the period-change action below would appear to offer switching
  // to the period they're already on.
  useEffect(() => {
    if (periodSynced.current || !subscription || autoUpgrade) return;
    periodSynced.current = true;
    setPeriod(subscription.period);
  }, [subscription, autoUpgrade]);

  const refresh = async () => {
    try {
      const [nextUsage, nextSub] = await loadAll();
      setUsage(nextUsage);
      setSubscription(nextSub);
    } catch {
      // Non-fatal: keep whatever was last shown.
    }
  };

  const pollForActivation = async (targetPlan: PaidPlanId): Promise<boolean> => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const next = await fetchUsage();
        setUsage(next);
        if (next.plan === targetPlan) return true;
      } catch {
        // Keep trying - a transient failure here shouldn't stop polling.
      }
    }
    return false;
  };

  const upgrade = async (plan: PaidPlanId, periodOverride?: BillingPeriod) => {
    const effectivePeriod = periodOverride ?? period;
    setProcessingPlan(plan);
    try {
      const response = await vaultFetch("/api/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, period: effectivePeriod }),
      });
      const payload = await response.json() as { subscriptionId?: string; keyId?: string; error?: string };
      if (!response.ok || !payload.subscriptionId || !payload.keyId) throw new Error(payload.error ?? "Could not start checkout.");

      await openSubscriptionCheckout({
        keyId: payload.keyId,
        subscriptionId: payload.subscriptionId,
        onSuccess: (result) => {
          void (async () => {
            try {
              await vaultFetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result),
              });
            } catch {
              // Non-fatal - the webhook is the real authority, this is just UX feedback.
            }
            toast("Payment received - activating your plan…", "info");
            const activated = await pollForActivation(plan);
            await refresh();
            setProcessingPlan(null);
            if (activated) toast("Upgraded to Plus", "success");
            else toast("Still confirming your payment - refresh in a moment if your plan doesn't update.", "info");
          })();
        },
        onDismiss: () => setProcessingPlan(null),
      });
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "Could not start checkout.", "error");
      setProcessingPlan(null);
    }
  };

  useEffect(() => {
    if (!autoUpgrade || autoUpgradeTriggered.current || !usage) return;
    if (usage.plan === autoUpgrade.plan) return; // Already on it - nothing to do.
    autoUpgradeTriggered.current = true;
    queueMicrotask(() => { void upgrade(autoUpgrade.plan, autoUpgrade.period); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usage, autoUpgrade]);

  const cancel = async () => {
    setCancelling(true);
    try {
      const response = await vaultFetch("/api/payments/cancel", { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not cancel your subscription.");
      toast("Cancellation scheduled for the end of your billing period", "success");
      await refresh();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "Could not cancel your subscription.", "error");
    } finally {
      setCancelling(false);
    }
  };

  const changePeriod = async (targetPeriod: BillingPeriod) => {
    setChangingPeriod(true);
    try {
      const response = await vaultFetch("/api/payments/change-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: targetPeriod }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; scheduled_period?: BillingPeriod | null };
      if (!response.ok) throw new Error(payload.error ?? "Could not change your billing period.");
      toast(
        payload.scheduled_period
          ? `Billing will switch to ${payload.scheduled_period === "yearly" ? "yearly" : "monthly"} at your next renewal`
          : "Pending billing change cancelled - you'll stay on your current plan",
        "success",
      );
      await refresh();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "Could not change your billing period.", "error");
    } finally {
      setChangingPeriod(false);
    }
  };

  if (loading) return <div className="settings-account-skeleton" aria-label="Loading plan" />;
  if (error || !usage) return <StateView kind="error" title="Plan unavailable" description={error ?? "Sign in again to load your plan."} />;

  const current = usage.plan;
  const hasCancellableSubscription = current !== "free" && subscription != null && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) && !subscription.cancel_at_cycle_end;

  return (
    <section className="settings-detail-section" aria-labelledby="settings-plan-title">
      <header>
        <p className="type-group-label">Plan &amp; usage</p>
        <h2 id="settings-plan-title">Your plan</h2>
        <p>Track how much of your plan you&apos;re using and change tiers anytime.</p>
      </header>

      {subscription?.last_payment_failed_at && (
        <p className="settings-plan-payment-warning" role="alert">
          Your last payment failed. We&apos;ll retry automatically - update your payment method with Razorpay if this continues, or your plan will drop to Free once retries are exhausted.
        </p>
      )}

      <div className="settings-group settings-plan-current">
        <div className="settings-plan-badge-row">
          <span className={`settings-plan-badge is-${current}`}>{current === "free" ? "Free" : "Plus"}</span>
          <span className="settings-plan-price">{priceFor(current, subscription?.period ?? period)}</span>
        </div>
        <p className="settings-plan-tagline">{TAGLINE[current]}</p>
        {subscription && current !== "free" && (
          <p className="settings-plan-renewal">
            {subscription.cancel_at_cycle_end
              ? `Cancellation scheduled${subscription.current_period_end ? ` for ${new Date(subscription.current_period_end).toLocaleDateString()}` : " for the billing-period end"}`
              : subscription.current_period_end
                ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : "Renews automatically"}
          </p>
        )}

        <Meter
          label="Document storage"
          value={usage.storage_bytes}
          max={usage.storage_limit || null}
          locked={usage.storage_limit === 0}
          caption={usage.storage_limit === 0 ? "Not included on Free" : `${formatBytes(usage.storage_bytes)} of ${formatBytes(usage.storage_limit)}`}
        />
        <Meter
          label="AI operations this month"
          value={usage.ai_used}
          max={usage.ai_limit}
          caption={usage.ai_limit == null ? `Unlimited · ${usage.ai_used} used` : `${usage.ai_used} of ${usage.ai_limit} used`}
        />
        <Meter
          label="Wallet & bank records"
          value={usage.wallet_count}
          max={usage.wallet_limit}
          caption={usage.wallet_limit == null ? `Unlimited · ${usage.wallet_count} stored` : `${usage.wallet_count} of ${usage.wallet_limit} used`}
        />
      </div>

      <div className="settings-billing-toggle" role="radiogroup" aria-label="Billing period">
        <button type="button" role="radio" aria-checked={period === "monthly"} className={period === "monthly" ? "is-active" : ""} onClick={() => setPeriod("monthly")}>Monthly</button>
        <button type="button" role="radio" aria-checked={period === "yearly"} className={period === "yearly" ? "is-active" : ""} onClick={() => setPeriod("yearly")}>Yearly <span>save ~15%</span></button>
      </div>

      <div className="settings-plan-options">
        {PLAN_IDS.map((plan) => {
          const isCurrent = plan === current;
          const label = plan === "free" ? "Free" : "Plus";
          return (
            <div key={plan} className={`settings-plan-option ${isCurrent ? "is-current" : ""}`}>
              <div className="settings-plan-option-head">
                <strong>{label}</strong>
                <span>{priceFor(plan, period)}</span>
              </div>
              <p>{TAGLINE[plan]}</p>
              {isCurrent ? (
                <>
                  <span className="settings-plan-current-pill"><CheckIcon aria-hidden="true" /> Current plan</span>
                  {plan !== "free" && subscription?.scheduled_period && (
                    <p className="settings-plan-renewal">
                      Switching to {subscription.scheduled_period === "yearly" ? "yearly" : "monthly"} billing at your next renewal
                    </p>
                  )}
                  {plan !== "free" && hasCancellableSubscription && !subscription?.scheduled_period && subscription && period !== subscription.period && (
                    <Button onClick={() => changePeriod(period)} disabled={changingPeriod} variant="outline" className="settings-plan-action">
                      {changingPeriod ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : `Switch to ${period === "yearly" ? "yearly" : "monthly"} billing`}
                    </Button>
                  )}
                  {plan !== "free" && hasCancellableSubscription && (
                    <Button onClick={cancel} disabled={cancelling} variant="outline" className="settings-plan-action">
                      {cancelling ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : "Cancel subscription"}
                    </Button>
                  )}
                </>
              ) : plan === "free" ? (
                <p className="settings-plan-downgrade-note">Cancel your subscription to return to Free.</p>
              ) : (
                <Button
                  onClick={() => upgrade(plan)}
                  disabled={processingPlan !== null}
                  className="settings-plan-action"
                >
                  {processingPlan === plan ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <><SparklesIcon aria-hidden="true" /> Upgrade to {label}</>}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="settings-plan-note">
        Payments are processed by Razorpay. Subscriptions renew automatically each billing period until cancelled.
      </p>
    </section>
  );
}
