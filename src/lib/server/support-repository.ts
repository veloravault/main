import "server-only";

import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const SUPPORT_TICKET_PAGE_SIZE = 25;

export type TicketStatus = "open" | "resolved";
export type MessageSender = "member" | "owner";
export type TicketFilter = "open" | "needs_reply" | "resolved" | "all";

export type AdminSupportTicket = {
  id: string;
  userId: string;
  memberEmail: string | null;
  subject: string;
  status: TicketStatus;
  lastMessageAt: string;
  lastMessageBy: MessageSender;
  createdAt: string;
};

export type AdminSupportMessage = {
  id: string;
  sender: MessageSender;
  body: string;
  createdAt: string;
};

type TicketRow = {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  last_message_at: string;
  last_message_by: MessageSender;
  created_at: string;
};

type MessageRow = {
  id: string;
  sender: MessageSender;
  body: string;
  created_at: string;
};

export type SupportTicketCursor = { lastMessageAt: string; id: string };
const SUPPORT_CURSOR_PATTERN = /^[A-Za-z0-9_-]+$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeSupportTicketCursor(cursor: SupportTicketCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function parseSupportTicketCursor(value: string | null): SupportTicketCursor | null {
  if (!value || value.length > 400 || !SUPPORT_CURSOR_PATTERN.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SupportTicketCursor>;
    if (
      typeof parsed.lastMessageAt !== "string"
      || !ISO_TIMESTAMP.test(parsed.lastMessageAt)
      || !Number.isFinite(Date.parse(parsed.lastMessageAt))
      || typeof parsed.id !== "string"
      || !UUID.test(parsed.id)
    ) return null;
    return { lastMessageAt: parsed.lastMessageAt, id: parsed.id };
  } catch {
    return null;
  }
}

function ticketDto(row: TicketRow, memberEmail: string | null): AdminSupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    memberEmail,
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.last_message_at,
    lastMessageBy: row.last_message_by,
    createdAt: row.created_at,
  };
}

function messageDto(row: MessageRow): AdminSupportMessage {
  return { id: row.id, sender: row.sender, body: row.body, createdAt: row.created_at };
}

export async function listSupportTicketsAdmin(args: {
  filter: TicketFilter;
  cursor: SupportTicketCursor | null;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("support_tickets")
    .select("id,user_id,subject,status,last_message_at,last_message_by,created_at")
    .order("last_message_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(SUPPORT_TICKET_PAGE_SIZE);

  if (args.filter === "open") query = query.eq("status", "open");
  if (args.filter === "needs_reply") query = query.eq("status", "open").eq("last_message_by", "member");
  if (args.filter === "resolved") query = query.eq("status", "resolved");
  if (args.cursor) {
    query = query.or(
      `last_message_at.lt.${args.cursor.lastMessageAt},and(last_message_at.eq.${args.cursor.lastMessageAt},id.lt.${args.cursor.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error("SUPPORT_TICKET_LIST_FAILED");
  const rows = (data ?? []) as TicketRow[];

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const emailById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: members, error: memberError } = await admin
      .from("app_members")
      .select("user_id,email")
      .in("user_id", userIds);
    if (memberError) throw new Error("SUPPORT_TICKET_MEMBERS_FAILED");
    for (const member of members ?? []) emailById.set(member.user_id, member.email);
  }

  const last = rows.at(-1);
  return {
    items: rows.map((row) => ticketDto(row, emailById.get(row.user_id) ?? null)),
    nextCursor: rows.length === SUPPORT_TICKET_PAGE_SIZE && last
      ? encodeSupportTicketCursor({ lastMessageAt: last.last_message_at, id: last.id })
      : null,
  };
}

export async function getSupportTicketAdmin(ticketId: string): Promise<{ ticket: AdminSupportTicket; messages: AdminSupportMessage[] } | null> {
  const admin = createSupabaseAdminClient();
  const { data: ticketRow, error: ticketError } = await admin
    .from("support_tickets")
    .select("id,user_id,subject,status,last_message_at,last_message_by,created_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError) throw new Error("SUPPORT_TICKET_LOAD_FAILED");
  if (!ticketRow) return null;

  const { data: memberRow, error: memberError } = await admin
    .from("app_members")
    .select("email")
    .eq("user_id", ticketRow.user_id)
    .maybeSingle();
  if (memberError) throw new Error("SUPPORT_TICKET_MEMBER_FAILED");

  const { data: messageRows, error: messagesError } = await admin
    .from("support_ticket_messages")
    .select("id,sender,body,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (messagesError) throw new Error("SUPPORT_TICKET_MESSAGES_FAILED");

  return {
    ticket: ticketDto(ticketRow as TicketRow, memberRow?.email ?? null),
    messages: (messageRows ?? []).map((row) => messageDto(row as MessageRow)),
  };
}

async function recordSupportAudit(args: {
  adminId: string;
  memberId: string;
  action: "support_reply" | "support_resolve" | "support_reopen";
  resultCode: "SENT" | "RESOLVED" | "OPEN";
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("admin_audit_log").insert({
    actor_user_id: args.adminId,
    member_user_id: args.memberId,
    action: args.action,
    result_code: args.resultCode,
  });
  if (error) console.error("ADMIN_SUPPORT_AUDIT_FAILED", { action: args.action });
}

export async function postAdminReply(args: {
  ticketId: string;
  body: string;
  adminId: string;
  memberId: string;
}): Promise<AdminSupportMessage> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_ticket_messages")
    .insert({ ticket_id: args.ticketId, sender: "owner", body: args.body })
    .select("id,sender,body,created_at")
    .single();
  if (error) throw new Error("SUPPORT_REPLY_FAILED");
  await recordSupportAudit({ adminId: args.adminId, memberId: args.memberId, action: "support_reply", resultCode: "SENT" });
  return messageDto(data as MessageRow);
}

export async function setSupportTicketStatusAdmin(args: {
  ticketId: string;
  status: TicketStatus;
  adminId: string;
}): Promise<AdminSupportTicket | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("support_tickets")
    .update({ status: args.status, updated_at: new Date().toISOString() })
    .eq("id", args.ticketId)
    .select("id,user_id,subject,status,last_message_at,last_message_by,created_at")
    .maybeSingle();
  if (error) throw new Error("SUPPORT_STATUS_UPDATE_FAILED");
  if (!data) return null;

  await recordSupportAudit({
    adminId: args.adminId,
    memberId: data.user_id,
    action: args.status === "resolved" ? "support_resolve" : "support_reopen",
    resultCode: args.status === "resolved" ? "RESOLVED" : "OPEN",
  });

  const { data: memberRow } = await admin.from("app_members").select("email").eq("user_id", data.user_id).maybeSingle();
  return ticketDto(data as TicketRow, memberRow?.email ?? null);
}
