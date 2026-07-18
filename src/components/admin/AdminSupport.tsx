"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, LifeBuoyIcon, SendIcon, XIcon } from "lucide-react";
import { StateView } from "@/components/ui/state-view";
import { useToast } from "@/components/Toast";
import { AdminSkeleton } from "./AdminSkeleton";
import type { AdminSupportMessage, AdminSupportTicket, TicketFilter, TicketStatus } from "./types";
import styles from "@/app/admin/admin.module.css";

const TICKET_FILTERS: readonly TicketFilter[] = ["open", "resolved", "all"];

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

export function AdminSupport() {
  const router = useRouter();
  const [filter, setFilter] = useState<TicketFilter>("open");
  const [items, setItems] = useState<AdminSupportTicket[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const load = useCallback(async (cursor: string | null, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
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
      setError("Tickets could not be loaded. Check the connection and try again.");
      if (!append) setItems([]);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(null, false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) return <AdminSkeleton />;
  if (error && items.length === 0) {
    return <StateView kind="error" title="Tickets unavailable" description={error} action={{ label: "Try again", onClick: () => void load(null, false) }} />;
  }

  return (
    <>
      <div className={styles.ticketFilterRow} role="tablist" aria-label="Ticket status">
        {TICKET_FILTERS.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} data-active={filter === value || undefined} onClick={() => setFilter(value)}>
            {value === "all" ? "All" : value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <StateView kind="empty" title="No tickets" description={filter === "open" ? "Nothing needs your attention right now." : "No tickets match this filter."} />
      ) : (
        <div className={styles.ticketList} role="list" aria-label="Support tickets">
          {items.map((ticket) => (
            <button key={ticket.id} type="button" className={styles.ticketRow} onClick={() => setActiveTicketId(ticket.id)}>
              <span className={styles.ticketGlyph} data-needs-reply={(ticket.status === "open" && ticket.lastMessageBy === "member") || undefined}>
                <LifeBuoyIcon aria-hidden="true" />
              </span>
              <span className={styles.ticketCopy}>
                <strong>{ticket.subject}</strong>
                <small>{ticket.memberEmail ?? "Unknown member"}</small>
              </span>
              <span className={styles.ticketMeta}>
                <span className={styles.ticketStatus} data-status={ticket.status}>{ticket.status}</span>
                <time dateTime={ticket.lastMessageAt}>{ticketTime(ticket.lastMessageAt)}</time>
              </span>
            </button>
          ))}
        </div>
      )}

      {nextCursor && (
        <button className={styles.loadMore} type="button" disabled={loadingMore} onClick={() => void load(nextCursor, true)}>
          {loadingMore ? "Loading more…" : "Load more"}
          {!loadingMore && <ChevronDownIcon aria-hidden="true" />}
        </button>
      )}

      {activeTicketId && (
        <TicketDetail ticketId={activeTicketId} onClose={() => setActiveTicketId(null)} onChanged={() => void load(null, false)} />
      )}
    </>
  );
}

function TicketDetail({ ticketId, onClose, onChanged }: { ticketId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [ticket, setTicket] = useState<AdminSupportTicket | null>(null);
  const [messages, setMessages] = useState<AdminSupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/admin/support/${ticketId}`, { headers: { accept: "application/json" } })
        .then(async (response) => {
          if (!response.ok) throw new Error("TICKET_LOAD_FAILED");
          return response.json() as Promise<{ ticket: AdminSupportTicket; messages: AdminSupportMessage[] }>;
        })
        .then((data) => { if (active) { setTicket(data.ticket); setMessages(data.messages); } })
        .catch(() => { if (active) setError("This ticket could not be loaded."); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [ticketId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const sendReply = async () => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      const response = await fetch(`/api/admin/support/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: AdminSupportMessage; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error ?? "REPLY_FAILED");
      setMessages((current) => [...current, payload.message as AdminSupportMessage]);
      // Status is left as-is: the DB trigger only reopens a ticket on a
      // *member* reply, so an owner reply must not optimistically flip it.
      setTicket((current) => current && { ...current, lastMessageBy: "owner", lastMessageAt: (payload.message as AdminSupportMessage).createdAt });
      setReply("");
      toast("Reply sent", "success");
      onChanged();
    } catch {
      toast("The reply could not be sent. Try again.", "error");
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!ticket) return;
    const nextStatus: TicketStatus = ticket.status === "open" ? "resolved" : "open";
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({})) as { ticket?: AdminSupportTicket; error?: string };
      if (!response.ok || !payload.ticket) throw new Error(payload.error ?? "STATUS_UPDATE_FAILED");
      setTicket(payload.ticket);
      toast(nextStatus === "resolved" ? "Ticket marked resolved" : "Ticket reopened", "success");
      onChanged();
    } catch {
      toast("The status could not be updated. Try again.", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.ticketDialog} role="dialog" aria-modal="true" aria-label={ticket?.subject ?? "Support ticket"}>
        <header className={styles.ticketDialogHeader}>
          <div>
            <p className={styles.eyebrow}>{ticket?.memberEmail ?? "Loading…"}</p>
            <h2>{ticket?.subject ?? "Ticket"}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}><XIcon aria-hidden="true" /></button>
        </header>

        {loading ? (
          <p className={styles.ticketThreadLoading}>Loading…</p>
        ) : error ? (
          <p className={styles.inlineActivityError} role="alert">{error}</p>
        ) : (
          <>
            <div className={styles.ticketThread}>
              {messages.map((message) => (
                <div key={message.id} className={styles.ticketMessage} data-sender={message.sender}>
                  <p>{message.body}</p>
                  <time dateTime={message.createdAt}>{ticketTime(message.createdAt)}</time>
                </div>
              ))}
            </div>
            <div className={styles.ticketReplyRow}>
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Write a reply…"
                rows={3}
                maxLength={4000}
              />
              <div className={styles.ticketReplyActions}>
                <button type="button" disabled={updatingStatus} onClick={() => void toggleStatus()}>
                  {updatingStatus ? "Updating…" : ticket?.status === "open" ? "Mark resolved" : "Reopen ticket"}
                </button>
                <button type="button" disabled={sending || !reply.trim()} onClick={() => void sendReply()} data-primary="true">
                  {sending ? "Sending…" : <><SendIcon aria-hidden="true" /> Send reply</>}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
