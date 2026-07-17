"use client";

import { useEffect, useState } from "react";
import { CheckIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { useToast } from "@/components/Toast";
import { PLAN_IDS, formatBytes, isPlanId, type PlanId } from "@/lib/plans";
import { PRICING_TIERS } from "@/components/dreelio/pricing-data";

interface AccountUsage {
  plan: PlanId;
  storage_bytes: number;
  storage_limit: number;
  ai_used: number;
  ai_limit: number | null;
  wallet_count: number;
  wallet_limit: number | null;
}

const TAGLINE: Record<PlanId, string> = {
  free: PRICING_TIERS[0].tagline,
  plus: PRICING_TIERS[1].tagline,
  family: PRICING_TIERS[2].tagline,
};

const PRICE: Record<PlanId, string> = {
  free: "₹0",
  plus: "₹49/mo",
  family: "₹99/mo",
};

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

export function PlanSettings() {
  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changing, setChanging] = useState<PlanId | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    fetchUsage()
      .then((next) => { if (active) { setUsage(next); setError(null); setLoading(false); } })
      .catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : "Your plan could not be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const switchPlan = async (plan: PlanId) => {
    setChanging(plan);
    const { error: rpcError } = await supabase.rpc("mock_set_plan", { p_plan: plan });
    if (rpcError) {
      toast(rpcError.message, "error");
      setChanging(null);
      return;
    }
    try {
      const next = await fetchUsage();
      setUsage(next);
    } catch {
      // Non-fatal: the plan changed even if the refreshed snapshot failed.
    }
    setChanging(null);
    toast(plan === "free" ? "Switched to Free" : `Upgraded to ${plan === "plus" ? "Plus" : "Family"}`, "success");
  };

  if (loading) return <div className="settings-account-skeleton" aria-label="Loading plan" />;
  if (error || !usage) return <StateView kind="error" title="Plan unavailable" description={error ?? "Sign in again to load your plan."} />;

  const current = usage.plan;

  return (
    <section className="settings-detail-section" aria-labelledby="settings-plan-title">
      <header>
        <p className="type-group-label">Plan &amp; usage</p>
        <h2 id="settings-plan-title">Your plan</h2>
        <p>Track how much of your plan you&apos;re using and change tiers anytime.</p>
      </header>

      <div className="settings-group settings-plan-current">
        <div className="settings-plan-badge-row">
          <span className={`settings-plan-badge is-${current}`}>{current === "free" ? "Free" : current === "plus" ? "Plus" : "Family"}</span>
          <span className="settings-plan-price">{PRICE[current]}</span>
        </div>
        <p className="settings-plan-tagline">{TAGLINE[current]}</p>

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

      <div className="settings-plan-options">
        {PLAN_IDS.map((plan) => {
          const isCurrent = plan === current;
          const label = plan === "free" ? "Free" : plan === "plus" ? "Plus" : "Family";
          return (
            <div key={plan} className={`settings-plan-option ${isCurrent ? "is-current" : ""}`}>
              <div className="settings-plan-option-head">
                <strong>{label}</strong>
                <span>{PRICE[plan]}</span>
              </div>
              <p>{TAGLINE[plan]}</p>
              {isCurrent ? (
                <span className="settings-plan-current-pill"><CheckIcon aria-hidden="true" /> Current plan</span>
              ) : (
                <Button
                  onClick={() => switchPlan(plan)}
                  disabled={changing !== null}
                  className="settings-plan-action"
                  variant={plan === "free" ? "outline" : "default"}
                >
                  {changing === plan ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : plan === "free" ? "Switch to Free" : <><SparklesIcon aria-hidden="true" /> Upgrade to {label}</>}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="settings-plan-note">
        Payments aren&apos;t wired up yet, so upgrades take effect immediately for now. Billing via Razorpay is coming soon.
      </p>
    </section>
  );
}
