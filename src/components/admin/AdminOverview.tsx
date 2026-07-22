"use client";

import { useEffect, useState } from "react";
import {
  ActivityIcon,
  ArrowRightIcon,
  BotIcon,
  DatabaseIcon,
  LifeBuoyIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { StateView } from "@/components/ui/state-view";
import type { AdminOverviewDto, AdminView } from "./types";
import styles from "@/app/admin/admin.module.css";

function formatBytes(value: number) {
  if (value < 1_024) return `${value} B`;
  if (value < 1_048_576) return `${(value / 1_024).toFixed(1)} KB`;
  if (value < 1_073_741_824) return `${(value / 1_048_576).toFixed(1)} MB`;
  return `${(value / 1_073_741_824).toFixed(1)} GB`;
}

function formatActivity(value: string) {
  return value.replaceAll("_", " ");
}

export function AdminOverview({ onNavigate }: { onNavigate: (view: AdminView, params?: Record<string, string>) => void }) {
  const [overview, setOverview] = useState<AdminOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/overview", { headers: { accept: "application/json" }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("OVERVIEW_FAILED");
        return response.json() as Promise<AdminOverviewDto>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setOverview(data);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setOverview(null);
        setError("The operations summary could not be loaded. Check the connection and try again.");
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const retry = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/overview", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("OVERVIEW_FAILED");
      setOverview(await response.json() as AdminOverviewDto);
    } catch {
      setOverview(null);
      setError("The operations summary could not be loaded. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.overviewLoading} role="status" aria-label="Loading operations overview"><span /><span /><span /><span /></div>;
  }
  if (error || !overview) {
    return <StateView kind="error" title="Overview unavailable" description={error ?? "The summary is unavailable."} action={{ label: "Try again", onClick: () => void retry() }} />;
  }

  const cards: Array<{
    label: string;
    value: string | number;
    detail: string;
    icon: typeof UsersIcon;
    view: AdminView;
    params?: Record<string, string>;
  }> = [
    { label: "Active members", value: overview.members.active, detail: `${overview.members.total} total · ${overview.members.invited} invited`, icon: UsersIcon, view: "members" as const, params: { status: "active" } },
    { label: "Needs reply", value: overview.support.needsReply, detail: `${overview.support.open} open · ${overview.support.resolved} resolved`, icon: LifeBuoyIcon, view: "support" as const, params: { ticket: "needs_reply" } },
  ];

  // Unlike the cards above, these two stats have no corresponding filtered
  // view to drill into (the members list only filters by status/search, and
  // activity categories don't include an "AI events" bucket) - rendered as
  // plain stat tiles rather than buttons so the UI doesn't promise a
  // drill-down that doesn't exist.
  const staticStats: Array<{ label: string; value: string | number; detail: string; icon: typeof UsersIcon }> = [
    { label: "Document storage", value: formatBytes(overview.usage.documentBytes), detail: "Encrypted files only", icon: DatabaseIcon },
    { label: "AI events this month", value: overview.usage.aiEvents, detail: "Across active accounts", icon: BotIcon },
  ];

  return (
    <div className={styles.overview} aria-live="polite">
      <div className={styles.overviewGrid}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button className={styles.overviewCard} type="button" key={card.label} onClick={() => onNavigate(card.view, card.params)}>
              <span className={styles.overviewCardIcon}><Icon aria-hidden="true" /></span>
              <span className={styles.overviewCardValue}>{card.value}</span>
              <strong>{card.label}</strong>
              <small>{card.detail}</small>
              <ArrowRightIcon className={styles.overviewCardArrow} aria-hidden="true" />
            </button>
          );
        })}
        {staticStats.map((card) => {
          const Icon = card.icon;
          return (
            <div className={styles.overviewCard} data-static="true" key={card.label}>
              <span className={styles.overviewCardIcon}><Icon aria-hidden="true" /></span>
              <span className={styles.overviewCardValue}>{card.value}</span>
              <strong>{card.label}</strong>
              <small>{card.detail}</small>
            </div>
          );
        })}
      </div>

      <div className={styles.overviewColumns}>
        <section className={styles.overviewPanel} aria-labelledby="access-health-title">
          <div className={styles.overviewPanelHeading}><span><ShieldCheckIcon aria-hidden="true" /></span><div><h2 id="access-health-title">Access health</h2><p>Current member and plan distribution.</p></div></div>
          <dl className={styles.overviewStats}>
            <div><dt>Invited</dt><dd>{overview.members.invited}</dd></div>
            <div><dt>Suspended</dt><dd>{overview.members.suspended}</dd></div>
            <div><dt>Revoked</dt><dd>{overview.members.revoked}</dd></div>
            <div><dt>Free / Plus</dt><dd>{overview.plans.free} / {overview.plans.plus}</dd></div>
          </dl>
          <button type="button" className={styles.overviewPanelAction} onClick={() => onNavigate("members")}>Review members <ArrowRightIcon aria-hidden="true" /></button>
        </section>

        <section className={styles.overviewPanel} aria-labelledby="recent-activity-title">
          <div className={styles.overviewPanelHeading}><span><ActivityIcon aria-hidden="true" /></span><div><h2 id="recent-activity-title">Recent activity</h2><p>The latest owner and access events.</p></div></div>
          {overview.recentActivity.length > 0 ? (
            <ul className={styles.overviewActivity}>
              {overview.recentActivity.map((item) => <li key={item.id}><span><strong>{formatActivity(item.action)}</strong><small>{item.memberEmail ?? item.resultCode}</small></span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(item.createdAt))}</time></li>)}
            </ul>
          ) : <p className={styles.overviewEmpty}>No owner activity has been recorded yet.</p>}
          <button type="button" className={styles.overviewPanelAction} onClick={() => onNavigate("activity")}>Open activity <ArrowRightIcon aria-hidden="true" /></button>
        </section>
      </div>
    </div>
  );
}
