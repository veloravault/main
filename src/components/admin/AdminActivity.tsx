"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  CreditCardIcon,
  ShieldBanIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import { StateView } from "@/components/ui/state-view";
import { AdminSkeleton } from "./AdminSkeleton";
import type { AdminActivityItem } from "./types";
import styles from "@/app/admin/admin.module.css";

type ActivityCategory = "all" | "access" | "support" | "invitation" | "billing" | "system";
type ActivityResult = "all" | "success" | "failure";

const CATEGORY_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "access", label: "Access" },
  { value: "support", label: "Support" },
  { value: "invitation", label: "Invites" },
  { value: "billing", label: "Billing" },
  { value: "system", label: "System" },
];
const RESULT_OPTIONS: { value: ActivityResult; label: string }[] = [
  { value: "all", label: "Any result" },
  { value: "success", label: "Successful" },
  { value: "failure", label: "Failed" },
];

function safeActivityPage(value: unknown): { items: AdminActivityItem[]; nextCursor: string | null } {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("INVALID_ACTIVITY_RESPONSE");
  }
  return {
    items: value.items as AdminActivityItem[],
    nextCursor: "nextCursor" in value && typeof value.nextCursor === "string" ? value.nextCursor : null,
  };
}

function activityCopy(item: AdminActivityItem) {
  if (item.action === "suspend") return { label: "Access blocked", detail: "Vault access was blocked", tone: "danger", Icon: ShieldBanIcon };
  if (item.action === "revoke") return { label: "Access revoked", detail: "Vault access was permanently revoked", tone: "danger", Icon: ShieldBanIcon };
  if (item.action === "restore") return { label: "Access restored", detail: "Vault access was restored", tone: "success", Icon: ShieldCheckIcon };
  if (item.action === "onboarding_complete") return { label: "Onboarding completed", detail: "The member finished vault setup", tone: "success", Icon: UserCheckIcon };
  if (item.action === "support_reply") return { label: "Support reply sent", detail: "The owner replied to a support ticket", tone: "success", Icon: CheckCircle2Icon };
  if (item.action === "support_resolve") return { label: "Ticket resolved", detail: "A support ticket was resolved", tone: "success", Icon: CheckCircle2Icon };
  if (item.action === "support_reopen") return { label: "Ticket reopened", detail: "A support ticket was reopened", tone: "neutral", Icon: CheckCircle2Icon };
  if (item.action === "setup_email_resent") return { label: "Setup link sent", detail: "A secure account setup link was sent", tone: "success", Icon: ShieldCheckIcon };
  if (item.action === "billing_reconciliation_resolve") return { label: "Billing reconciled", detail: "A billing reconciliation issue was resolved", tone: "success", Icon: CreditCardIcon };
  if (item.action.includes("approve") || item.action.includes("invite")) return { label: "Member approved", detail: "Account access was approved", tone: "success", Icon: ShieldCheckIcon };
  return { label: item.action.replaceAll("_", " "), detail: item.resultCode.replaceAll("_", " "), tone: "neutral", Icon: CheckCircle2Icon };
}

function activityTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminActivity() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const resultParam = searchParams.get("result");
  const category: ActivityCategory = CATEGORY_OPTIONS.some((option) => option.value === categoryParam) ? categoryParam as ActivityCategory : "all";
  const result: ActivityResult = RESULT_OPTIONS.some((option) => option.value === resultParam) ? resultParam as ActivityResult : "all";
  const [items, setItems] = useState<AdminActivityItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor: string | null, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ category, result });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/admin/activity?${params.toString()}`, { headers: { accept: "application/json" } });
      if (response.status === 401) {
        router.replace("/login?next=/admin");
        return;
      }
      if (response.status === 403) {
        setItems([]);
        setNextCursor(null);
        setError("This account no longer has access to the owner console.");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("ACTIVITY_LOAD_FAILED");
      const page = safeActivityPage(await response.json());
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch {
      setError("The audit record could not be loaded. Check the connection and try again.");
      if (!append) setItems([]);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [category, result, router]);

  const updateFilters = (nextCategory: ActivityCategory, nextResult: ActivityResult) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", nextCategory);
    params.set("result", nextResult);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(null, false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  let content;
  if (loading) content = <AdminSkeleton />;
  else if (error && items.length === 0) content = <StateView kind="error" title="Activity unavailable" description={error} action={{ label: "Try again", onClick: () => void load(null, false) }} />;
  else if (items.length === 0) content = <StateView kind="empty" title="No matching activity" description="Try a different category or result filter." />;
  else content = (
    <>
      <div className={styles.activityList} role="list" aria-label="Owner activity">
        {items.map((item) => {
          const copy = activityCopy(item);
          const Icon = copy.Icon;
          return (
            <article className={styles.activityRow} key={item.id} role="listitem">
              <span className={styles.activityGlyph} data-tone={copy.tone}><Icon aria-hidden="true" /></span>
              <span className={styles.activityCopy}>
                <strong>{copy.label}</strong>
                <small>{item.memberEmail ?? "System event"} · {copy.detail}</small>
              </span>
              <time dateTime={item.createdAt}>{activityTime(item.createdAt)}</time>
            </article>
          );
        })}
      </div>
      {error && <p className={styles.inlineActivityError} role="alert">{error}</p>}
      {nextCursor ? (
        <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void load(nextCursor, true)}>
          {loadingMore ? "Loading more…" : "Load older activity"}
          {!loadingMore && <ChevronDownIcon aria-hidden="true" />}
        </button>
      ) : <p className={styles.endNote}><CheckCircle2Icon aria-hidden="true" />You’re up to date.</p>}
    </>
  );

  return (
    <>
      <div className={styles.activityFilters} aria-label="Activity filters">
        <div role="group" aria-label="Activity category">
          {CATEGORY_OPTIONS.map((option) => (
            <button type="button" key={option.value} data-active={category === option.value || undefined} aria-pressed={category === option.value} onClick={() => updateFilters(option.value, result)}>
              {option.label}
            </button>
          ))}
        </div>
        <label>
          <span>Result</span>
          <select value={result} onChange={(event) => updateFilters(category, event.target.value as ActivityResult)}>
            {RESULT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      {content}
    </>
  );
}
