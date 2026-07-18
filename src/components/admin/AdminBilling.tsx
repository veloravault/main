"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CreditCardIcon, Loader2Icon } from "lucide-react";
import { StateView } from "@/components/ui/state-view";
import { AdminSkeleton } from "./AdminSkeleton";
import { useToast } from "@/components/Toast";
import type { AdminBillingReconciliationIssue, BillingReconciliationFilter } from "./types";
import styles from "@/app/admin/admin.module.css";

const FILTERS: readonly BillingReconciliationFilter[] = ["pending", "resolved", "all"];

function isFilter(value: string | null): value is BillingReconciliationFilter {
  return FILTERS.includes(value as BillingReconciliationFilter);
}

function issueTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function actionLabel(action: AdminBillingReconciliationIssue["action"]) {
  return action === "cancel" ? "Cancel" : "Change period";
}

function updateSummary(update: Record<string, unknown>) {
  return Object.entries(update).map(([key, value]) => `${key} → ${JSON.stringify(value)}`).join(", ");
}

export function AdminBilling() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const filter = isFilter(searchParams.get("billing")) ? searchParams.get("billing") as BillingReconciliationFilter : "pending";
  const [items, setItems] = useState<AdminBillingReconciliationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const selectFilter = (value: BillingReconciliationFilter) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "pending") next.delete("billing");
    else next.set("billing", value);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/billing-reconciliation?filter=${filter}`, { headers: { accept: "application/json" } });
      if (response.status === 401) { router.replace("/login?next=/admin"); return; }
      if (response.status === 403) {
        setItems([]);
        setError("This account no longer has access to the owner console.");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("BILLING_LIST_FAILED");
      const body = await response.json() as { items?: AdminBillingReconciliationIssue[] };
      setItems(body.items ?? []);
    } catch {
      setError("Reconciliation issues could not be loaded. Check the connection and try again.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const resolveIssue = async (issue: AdminBillingReconciliationIssue) => {
    if (resolvingId) return;
    setResolvingId(issue.id);
    try {
      const response = await fetch(`/api/admin/billing-reconciliation/${encodeURIComponent(issue.id)}`, { method: "PATCH" });
      if (response.ok) {
        toast({ message: `Reconciled ${issue.razorpaySubscriptionId}.`, type: "success" });
        await load();
      } else if (response.status === 404) {
        toast({ message: "This issue is no longer available. The list was refreshed.", type: "info" });
        await load();
      } else if (response.status === 401) {
        toast({ message: "Your owner session expired. Sign in again.", type: "error" });
        router.replace("/login?next=/admin");
      } else {
        toast({ message: "The retry failed. Try again.", type: "error" });
      }
    } catch {
      toast({ message: "The connection dropped before the retry could finish. Try again.", type: "error" });
    } finally {
      setResolvingId(null);
    }
  };

  if (loading && items.length === 0) return <AdminSkeleton />;
  if (error && items.length === 0) {
    return <StateView kind="error" title="Reconciliation issues unavailable" description={error} action={{ label: "Try again", onClick: () => void load() }} />;
  }

  return (
    <div className={styles.supportInbox}>
      <div className={styles.ticketFilterRow} role="tablist" aria-label="Reconciliation status">
        {FILTERS.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} data-active={filter === value || undefined} onClick={() => selectFilter(value)}>
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <StateView kind="empty" title="No reconciliation issues" description={filter === "pending" ? "Razorpay and the local database are in sync." : "No issues match this filter."} />
      ) : (
        <div className={styles.memberList} role="list" aria-label="Billing reconciliation issues">
          {items.map((issue) => {
            const resolving = resolvingId === issue.id;
            return (
              <article className={styles.memberRow} key={issue.id} role="listitem">
                <span className={styles.memberGlyph}><CreditCardIcon aria-hidden="true" /></span>
                <span className={styles.memberIdentity}>
                  <strong>{issue.memberEmail ?? "Unknown member"} · {actionLabel(issue.action)}</strong>
                  <small title={issue.errorMessage ?? undefined}>
                    {issue.razorpaySubscriptionId} · {updateSummary(issue.intendedUpdate)} · {issueTime(issue.createdAt)}
                  </small>
                </span>
                <span className={styles.memberActions}>
                  <span className={styles.memberStatus} data-status={issue.status === "resolved" ? "active" : undefined}>{issue.status}</span>
                  {issue.status === "pending" && (
                    <button type="button" disabled={resolving} onClick={() => void resolveIssue(issue)}>
                      {resolving ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : "Retry"}
                    </button>
                  )}
                </span>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
