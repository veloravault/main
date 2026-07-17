"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ShieldBanIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import { StateView } from "@/components/ui/state-view";
import { AdminSkeleton } from "./AdminSkeleton";
import type { AdminActivityItem } from "./types";
import styles from "@/app/admin/admin.module.css";

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
  if (item.action === "onboarding_complete") return { label: "Onboarding completed", detail: "The member finished vault setup", tone: "success", Icon: UserCheckIcon };
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
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
      const response = await fetch(`/api/admin/activity${query}`, { headers: { accept: "application/json" } });
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
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(null, false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) return <AdminSkeleton />;
  if (error && items.length === 0) return <StateView kind="error" title="Activity unavailable" description={error} action={{ label: "Try again", onClick: () => void load(null, false) }} />;
  if (items.length === 0) return <StateView kind="empty" title="No activity yet" description="Access changes and completed onboarding events will appear here." />;

  return (
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
}
