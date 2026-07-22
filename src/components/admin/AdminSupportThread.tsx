"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, RotateCcwIcon, SendIcon, XIcon } from "lucide-react";
import type { AdminSupportMessage, AdminSupportTicket, TicketStatus } from "./types";
import styles from "@/app/admin/admin.module.css";

function ticketTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function supportMutationError(status: number, operation: "reply" | "status") {
  if (status === 400) return operation === "reply" ? "Write a reply between 1 and 4,000 characters." : "That status update is invalid.";
  if (status === 401) return "Your owner session expired. Sign in again.";
  if (status === 403) return "Owner access could not be verified.";
  if (status === 404) return "This ticket no longer exists.";
  if (status === 409 && operation === "status") return "The member replied since you opened this conversation - reloaded below. Review it before resolving.";
  return operation === "reply" ? "The reply could not be confirmed. Try again." : "The ticket status could not be confirmed. Try again.";
}

export function AdminSupportThread(props: { ticketId: string; onClose: () => void; onChanged: () => void }) {
  const router = useRouter();
  const threadRef = useRef<HTMLDivElement>(null);
  const [ticket, setTicket] = useState<AdminSupportTicket | null>(null);
  const [messages, setMessages] = useState<AdminSupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/support/${encodeURIComponent(props.ticketId)}`, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login?next=/admin");
          throw new Error("SESSION_EXPIRED");
        }
        if (!response.ok) throw new Error("TICKET_LOAD_FAILED");
        return response.json() as Promise<{ ticket: AdminSupportTicket; messages: AdminSupportMessage[] }>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setTicket(payload.ticket);
        setMessages(payload.messages);
        setLoadError(null);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError("This conversation could not be loaded. Try again.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [props.ticketId, reloadKey, router]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sending && !updatingStatus) props.onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [props, sending, updatingStatus]);

  const retryLoad = () => {
    setLoading(true);
    setLoadError(null);
    setReloadKey((value) => value + 1);
  };

  const sendReply = async () => {
    const body = reply.trim();
    if (!body || sending) return;
    setSending(true);
    setReplyError(null);
    setAnnouncement("Sending reply.");
    try {
      const response = await fetch(`/api/admin/support/${encodeURIComponent(props.ticketId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json().catch(() => null) as { message?: AdminSupportMessage } | null;
      if (!response.ok || !payload?.message) {
        setReplyError(supportMutationError(response.status, "reply"));
        setAnnouncement("Reply failed. The draft was kept.");
        return;
      }
      setMessages((current) => [...current, payload.message as AdminSupportMessage]);
      setTicket((current) => current && { ...current, lastMessageBy: "owner", lastMessageAt: (payload.message as AdminSupportMessage).createdAt });
      setReply("");
      setAnnouncement("Reply sent.");
      props.onChanged();
    } catch {
      setReplyError("The connection dropped before the reply could be confirmed. Your draft was kept.");
      setAnnouncement("Reply failed. The draft was kept.");
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!ticket || updatingStatus) return;
    const nextStatus: TicketStatus = ticket.status === "open" ? "resolved" : "open";
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      const response = await fetch(`/api/admin/support/${encodeURIComponent(props.ticketId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => null) as { ticket?: AdminSupportTicket } | null;
      if (!response.ok || !payload?.ticket) {
        setStatusError(supportMutationError(response.status, "status"));
        // A new member message arrived since this thread was loaded - reload
        // it so the admin actually sees what they're about to resolve past.
        if (response.status === 409) retryLoad();
        return;
      }
      setTicket(payload.ticket);
      setAnnouncement(nextStatus === "resolved" ? "Ticket resolved." : "Ticket reopened.");
      props.onChanged();
    } catch {
      setStatusError("The connection dropped before the status could be confirmed.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <section className={styles.supportThread} role="region" aria-label={ticket?.subject ? `Conversation: ${ticket.subject}` : "Support conversation"}>
      <header className={styles.supportThreadHeader}>
        <div><p className={styles.eyebrow}>{ticket?.memberEmail ?? "Member conversation"}</p><h2>{ticket?.subject ?? "Support ticket"}</h2>{ticket && <span className={styles.ticketStatus} data-status={ticket.status}>{ticket.status}</span>}</div>
        <button type="button" aria-label="Close thread" onClick={props.onClose}><XIcon aria-hidden="true" /></button>
      </header>

      {loading ? <p className={styles.supportThreadState} role="status">Loading conversation…</p> : loadError ? (
        <div className={styles.supportThreadState} role="alert"><p>{loadError}</p><button type="button" onClick={retryLoad}>Try again</button></div>
      ) : (
        <>
          <div ref={threadRef} className={styles.supportThreadMessages} aria-label="Ticket messages">
            {messages.map((message) => <article key={message.id} className={styles.ticketMessage} data-sender={message.sender}><p>{message.body}</p><time dateTime={message.createdAt}>{ticketTime(message.createdAt)}</time></article>)}
          </div>
          <div className={styles.supportComposer}>
            <label><span className="sr-only">Write a reply</span><textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply…" rows={3} maxLength={4000} /></label>
            {replyError && <p className={styles.supportInlineError} role="alert">{replyError}</p>}
            {statusError && <p className={styles.supportInlineError} role="alert">{statusError}</p>}
            <div className={styles.supportComposerActions}>
              <button type="button" disabled={updatingStatus || sending} onClick={() => void toggleStatus()}>{updatingStatus ? "Updating…" : ticket?.status === "open" ? <><CheckCircle2Icon aria-hidden="true" />Resolve</> : <><RotateCcwIcon aria-hidden="true" />Reopen</>}</button>
              <button type="button" data-primary disabled={sending || updatingStatus || !reply.trim()} onClick={() => void sendReply()}>{sending ? "Sending…" : <><SendIcon aria-hidden="true" />Send reply</>}</button>
            </div>
          </div>
        </>
      )}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
  );
}
