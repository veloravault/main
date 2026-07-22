"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, LifeBuoyIcon } from "lucide-react";
import { StateView } from "@/components/ui/state-view";
import { AdminSkeleton } from "./AdminSkeleton";
import { AdminSupportThread } from "./AdminSupportThread";
import type { AdminSupportTicket, TicketFilter } from "./types";
import styles from "@/app/admin/admin.module.css";

const TICKET_FILTERS: readonly TicketFilter[] = ["open", "needs_reply", "resolved", "all"];

function isTicketFilter(value: string | null): value is TicketFilter {
  return TICKET_FILTERS.includes(value as TicketFilter);
}

function safeTicketPage(value: unknown): { items: AdminSupportTicket[]; nextCursor: string | null } {
  if (!value || typeof value !== "object" || !("items" in value) || !Array.isArray(value.items)) {
    throw new Error("INVALID_SUPPORT_RESPONSE");
  }
  return {
    items: value.items as AdminSupportTicket[],
    nextCursor: "nextCursor" in value && typeof value.nextCursor === "string" ? value.nextCursor : null,
  };
}

function ticketTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function filterLabel(value: TicketFilter) {
  if (value === "needs_reply") return "Needs reply";
  return value === "all" ? "All" : value[0].toUpperCase() + value.slice(1);
}

export function AdminSupport() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedFilter = searchParams.get("ticket");
  const filter = isTicketFilter(requestedFilter) ? requestedFilter : "open";
  const [items, setItems] = useState<AdminSupportTicket[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appendError, setAppendError] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const selectFilter = (value: TicketFilter) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "open") next.delete("ticket");
    else next.set("ticket", value);
    next.delete("cursor");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
    setActiveTicketId(null);
  };

  const load = useCallback(async (cursor: string | null, append: boolean) => {
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
      const response = await fetch(`/api/admin/support?${params}`, { headers: { accept: "application/json" } });
      if (response.status === 401) { router.replace("/login?next=/admin"); return; }
      if (response.status === 403) {
        setItems([]);
        setNextCursor(null);
        setError("This account no longer has access to the owner console.");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error("SUPPORT_LIST_FAILED");
      const page = safeTicketPage(await response.json());
      setItems((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch {
      const message = "Tickets could not be loaded. Check the connection and try again.";
      if (append) setAppendError(message);
      else {
        setError(message);
        setItems([]);
      }
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(null, false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading && items.length === 0 && !activeTicketId) return <AdminSkeleton />;
  if (error && items.length === 0 && !activeTicketId) {
    return <StateView kind="error" title="Tickets unavailable" description={error} action={{ label: "Try again", onClick: () => void load(null, false) }} />;
  }

  return (
    <div className={styles.supportInbox}>
      <div className={styles.ticketFilterRow} role="tablist" aria-label="Ticket status">
        {TICKET_FILTERS.map((value) => <button key={value} type="button" role="tab" aria-selected={filter === value} data-active={filter === value || undefined} onClick={() => selectFilter(value)}>{filterLabel(value)}</button>)}
      </div>

      <div className={styles.supportWorkspace} data-thread-open={Boolean(activeTicketId) || undefined}>
        <section className={styles.supportTicketPane} aria-label={`${filterLabel(filter)} tickets`}>
          {items.length === 0 ? (
            <StateView kind="empty" title="No tickets" description={filter === "needs_reply" ? "Every open conversation has an owner reply." : filter === "open" ? "Nothing is open right now." : "No tickets match this filter."} />
          ) : (
            <div className={styles.ticketList} role="list" aria-label="Support tickets">
              {items.map((ticket) => (
                <button key={ticket.id} type="button" className={styles.ticketRow} data-active={activeTicketId === ticket.id || undefined} onClick={() => setActiveTicketId(ticket.id)}>
                  <span className={styles.ticketGlyph} data-needs-reply={(ticket.status === "open" && ticket.lastMessageBy === "member") || undefined}><LifeBuoyIcon aria-hidden="true" /></span>
                  <span className={styles.ticketCopy}><strong>{ticket.subject}</strong><small>{ticket.memberEmail ?? "Unknown member"}{ticket.status === "open" && ticket.lastMessageBy === "member" ? " · Needs reply" : ""}</small></span>
                  <span className={styles.ticketMeta}><span className={styles.ticketStatus} data-status={ticket.status}>{ticket.status}</span><time dateTime={ticket.lastMessageAt}>{ticketTime(ticket.lastMessageAt)}</time></span>
                </button>
              ))}
            </div>
          )}

          {appendError && <div className={styles.supportListError} role="alert"><span>{appendError}</span><button type="button" onClick={() => nextCursor && void load(nextCursor, true)}>Retry</button></div>}
          {nextCursor && !appendError && <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void load(nextCursor, true)}>{loadingMore ? "Loading more…" : "Load more"}{!loadingMore && <ChevronDownIcon aria-hidden="true" />}</button>}
        </section>

        {activeTicketId ? (
          <AdminSupportThread key={activeTicketId} ticketId={activeTicketId} onClose={() => setActiveTicketId(null)} onChanged={() => void load(null, false)} />
        ) : (
          <div className={styles.supportThreadPlaceholder}><LifeBuoyIcon aria-hidden="true" /><strong>Select a conversation</strong><p>Messages and reply controls will appear here.</p></div>
        )}
      </div>
    </div>
  );
}
