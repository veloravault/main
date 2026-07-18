"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon, LifeBuoyIcon, Loader2Icon, SendIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { StateView } from "@/components/ui/state-view";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { useToast } from "@/components/Toast";

type TicketStatus = "open" | "resolved";
type MessageSender = "member" | "owner";

interface SupportTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  last_message_at: string;
  last_message_by: MessageSender;
  created_at: string;
}

interface SupportMessage {
  id: string;
  sender: MessageSender;
  body: string;
  created_at: string;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const SUPPORT_ERROR_MESSAGES: Record<string, string> = {
  SUPPORT_NOT_ACTIVE_MEMBER: "Your account isn't active on this vault, so support tickets aren't available right now.",
  SUPPORT_INVALID_SUBJECT: "Subject must be between 3 and 160 characters.",
  SUPPORT_INVALID_MESSAGE: "Message must be between 1 and 4000 characters.",
  SUPPORT_TICKET_RATE_LIMITED: "You've opened too many tickets in the last hour. Try again later.",
  SUPPORT_MESSAGE_RATE_LIMITED: "You've sent too many messages in the last hour. Try again later.",
  SUPPORT_TICKET_NOT_FOUND: "This ticket could not be found.",
};

function supportErrorMessage(error: { message?: string } | null | undefined, fallback: string) {
  const code = error?.message ? Object.keys(SUPPORT_ERROR_MESSAGES).find((key) => error.message?.includes(key)) : null;
  return code ? SUPPORT_ERROR_MESSAGES[code] : fallback;
}

export function SupportSettings() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTicketError, setNewTicketError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("support_tickets")
      .select("id,subject,status,last_message_at,last_message_by,created_at")
      .order("last_message_at", { ascending: false });
    if (fetchError) {
      console.error("Error fetching support tickets:", fetchError);
      setError("Your tickets could not be loaded.");
      setLoading(false);
      return;
    }
    setTickets((data ?? []) as SupportTicket[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchTickets(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchTickets]);

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      setNewTicketError("Add a subject and describe what you need help with.");
      return;
    }
    setNewTicketError(null);
    setCreating(true);
    try {
      const { data: ticketId, error: rpcError } = await supabase.rpc("create_support_ticket", {
        p_subject: newSubject.trim(),
        p_message: newMessage.trim(),
      });
      if (rpcError || !ticketId) {
        throw new Error(supportErrorMessage(rpcError, "Your ticket could not be created."));
      }

      setNewSubject("");
      setNewMessage("");
      setIsNewOpen(false);
      toast("Support ticket opened", "success");
      await fetchTickets();
      setSelectedTicketId(ticketId as string);
    } catch (reason) {
      setNewTicketError(reason instanceof Error ? reason.message : "Your ticket could not be created.");
    } finally {
      setCreating(false);
    }
  };

  if (selectedTicketId) {
    return (
      <TicketThread
        ticketId={selectedTicketId}
        onBack={() => { setSelectedTicketId(null); void fetchTickets(); }}
      />
    );
  }

  return (
    <section className="settings-detail-section" aria-labelledby="settings-support-title">
      <header>
        <p className="type-group-label">Support</p>
        <h2 id="settings-support-title">Get help</h2>
        <p>Open a ticket and the vault owner will reply here.</p>
      </header>

      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsNewOpen(true)} className="settings-primary-button"><LifeBuoyIcon />New ticket</Button>
      </div>

      {loading ? (
        <div className="settings-account-skeleton" aria-label="Loading tickets" />
      ) : error ? (
        <StateView kind="error" title="Tickets unavailable" description={error} action={{ label: "Try again", onClick: () => void fetchTickets() }} />
      ) : tickets.length === 0 ? (
        <StateView kind="empty" title="No tickets yet" description="Open a ticket if you run into a problem or have a question." />
      ) : (
        <div className="apple-grouped-list">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => setSelectedTicketId(ticket.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
            >
              <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><LifeBuoyIcon className="w-4 h-4" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold text-foreground truncate">{ticket.subject}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {ticket.last_message_by === "owner" ? "Owner replied" : "Awaiting reply"} · {formatTime(ticket.last_message_at)}
                </span>
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0 ${ticket.status === "open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {ticket.status}
              </span>
            </button>
          ))}
        </div>
      )}

      <AdaptiveSheet open={isNewOpen} onOpenChange={(open) => { setIsNewOpen(open); if (!open) setNewTicketError(null); }} title="New support ticket" description="Describe what you need help with — the owner will reply here." size="md">
        <form onSubmit={createTicket} noValidate>
          <AdaptiveSheetBody className="space-y-4">
            <div className="space-y-1">
              <label className="text-[13px] text-muted-foreground ml-1 uppercase tracking-wider font-medium">Subject</label>
              <input
                type="text"
                placeholder="e.g. Can't restore my backup"
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                maxLength={160}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[13px] text-muted-foreground ml-1 uppercase tracking-wider font-medium">Message</label>
              <textarea
                placeholder="What's going on?"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[130px] resize-y"
                required
              />
            </div>
            {newTicketError && <p className="text-[13px] text-destructive px-1" role="alert">{newTicketError}</p>}
          </AdaptiveSheetBody>
          <AdaptiveSheetFooter>
            <Button type="button" variant="ghost" onClick={() => setIsNewOpen(false)}>Cancel</Button>
            <Button type="submit" className="import-primary-action" disabled={creating}>{creating ? <><Loader2Icon className="animate-spin" />Opening…</> : "Open ticket"}</Button>
          </AdaptiveSheetFooter>
        </form>
      </AdaptiveSheet>
    </section>
  );
}

function TicketThread({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const toast = useToast();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: ticketRow, error: ticketError }, { data: messageRows, error: messagesError }] = await Promise.all([
      supabase.from("support_tickets").select("id,subject,status,last_message_at,last_message_by,created_at").eq("id", ticketId).maybeSingle(),
      supabase.from("support_ticket_messages").select("id,sender,body,created_at").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    ]);
    if (ticketError || messagesError || !ticketRow) {
      setError("This ticket could not be loaded.");
      setLoading(false);
      return;
    }
    setTicket(ticketRow as SupportTicket);
    setMessages((messageRows ?? []) as SupportMessage[]);
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchThread(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchThread]);

  const sendReply = async () => {
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      const { error: rpcError } = await supabase.rpc("reply_support_ticket", { p_ticket_id: ticketId, p_body: body });
      if (rpcError) throw new Error(supportErrorMessage(rpcError, "Your reply could not be sent."));
      setReply("");
      await fetchThread();
    } catch (reason) {
      toast(reason instanceof Error ? reason.message : "Your reply could not be sent.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="settings-detail-section" aria-labelledby="settings-ticket-title">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ChevronLeftIcon className="w-4 h-4" /> All tickets
      </button>

      {loading ? (
        <div className="settings-account-skeleton" aria-label="Loading ticket" />
      ) : error || !ticket ? (
        <StateView kind="error" title="Ticket unavailable" description={error ?? "This ticket could not be found."} action={{ label: "Try again", onClick: () => void fetchThread() }} />
      ) : (
        <>
          <header className="mb-4">
            <p className="type-group-label">Support ticket</p>
            <h2 id="settings-ticket-title">{ticket.subject}</h2>
            <p className={`inline-flex mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ticket.status === "open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {ticket.status}
            </p>
          </header>

          <div className="flex flex-col gap-3 mb-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${message.sender === "member" ? "self-end bg-primary/10" : "self-start bg-muted"}`}
              >
                <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap">{message.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{message.sender === "owner" ? "Owner" : "You"} · {formatTime(message.created_at)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Write a reply…"
              rows={3}
              maxLength={4000}
              className="w-full bg-secondary border border-transparent rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
            />
            <div className="flex justify-end">
              <Button onClick={() => void sendReply()} disabled={sending || !reply.trim()} className="settings-primary-button">
                {sending ? <Loader2Icon className="animate-spin" /> : <><SendIcon className="w-4 h-4" />Send reply</>}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
