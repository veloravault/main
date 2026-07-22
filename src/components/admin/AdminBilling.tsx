"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDownIcon, CreditCardIcon, Loader2Icon } from "lucide-react";
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

function safeBillingPage(value: unknown): { items: AdminBillingReconciliationIssue[]; nextCursor: string | null } {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("INVALID_BILLING_RESPONSE");
  }
  return {
    items: value.items as AdminBillingReconciliationIssue[],
    nextCursor: "nextCursor" in value && typeof value.nextCursor === "string" ? value.nextCursor : null,
  };
}

export function AdminBilling() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const filter = isFilter(searchParams.get("billing")) ? searchParams.get("billing") as BillingReconciliationFilter : "pending";
  const [items, setItems] = useState<AdminBillingReconciliationIssue[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appendError, setAppendError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  // Guards against a stale in-flight request (e.g. a slow "load more")
  // resolving after the filter has already changed and clobbering the
  // current view with results from the old filter.
  const requestIdRef = useRef(0);

  const selectFilter = (value: BillingReconciliationFilter) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "pending") next.delete("billing");
    else next.set("billing", value);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const load = useCallback(async (cursor: string | null, append: boolean) => {
    const requestId = ++requestIdRef.current;
    if (append) {
      setLoadingMore(true);
      setAppendError(null);
    } else {
      setLoading(true);
      setError(null);
      setAppendError(null);
    }
    try {
      const params = new URLSearchParams({ filter });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/admin/billing-reconciliation?${params}`, { headers: { accept: "application/json" } });
      if (requestId !== requestIdRef.current) return;
      if (response.status === 401) { router.replace("/login?next=/admin"); return; }
      if (response.status === 403) {
        setItems([]);
        setNextCursor(null);
        setError("This account no longer has access to the owner console.");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("BILLING_LIST_FAILED");
      const page = safeBillingPage(await response.json());
      if (requestId !== requestIdRef.current) return;
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch {
      if (requestId !== requestIdRef.current) return;
      const message = "Reconciliation issues could not be loaded. Check the connection and try again.";
      if (append) setAppendError(message);
      else {
        setError(message);
        setItems([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    }
  }, [filter, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(null, false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const resolveIssue = async (issue: AdminBillingReconciliationIssue) => {
    if (resolvingId) return;
    setResolvingId(issue.id);
    try {
      const response = await fetch(`/api/admin/billing-reconciliation/${encodeURIComponent(issue.id)}`, { method: "PATCH" });
      if (response.ok) {
        toast({ message: `Reconciled ${issue.razorpaySubscriptionId}.`, type: "success" });
        await load(null, false);
      } else if (response.status === 404) {
        toast({ message: "This issue is no longer available. The list was refreshed.", type: "info" });
        await load(null, false);
      } else if (response.status === 409) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        if (body?.error === "ISSUE_ALREADY_RESOLVED") {
          toast({ message: "Someone else already resolved this. The list was refreshed.", type: "info" });
        } else {
          toast({ message: "The target subscription could not be found - nothing was changed.", type: "error" });
        }
        await load(null, false);
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
    return <StateView kind="error" title="Reconciliation issues unavailable" description={error} action={{ label: "Try again", onClick: () => void load(null, false) }} />;
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
                    <button type="button" disabled={Boolean(resolvingId)} onClick={() => void resolveIssue(issue)}>
                      {resolving ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : "Retry"}
                    </button>
                  )}
                </span>
              </article>
            );
          })}
        </div>
      )}

      {appendError && <div className={styles.supportListError} role="alert"><span>{appendError}</span><button type="button" onClick={() => nextCursor && void load(nextCursor, true)}>Retry</button></div>}
      {nextCursor && !appendError && <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void load(nextCursor, true)}>{loadingMore ? "Loading more…" : "Load more"}{!loadingMore && <ChevronDownIcon aria-hidden="true" />}</button>}
    </div>
  );
}
