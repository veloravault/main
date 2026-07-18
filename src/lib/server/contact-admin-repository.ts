import "server-only";

import type { ContactTopic } from "@/lib/contact";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const CONTACT_SUBMISSION_PAGE_SIZE = 25;

export type ContactSubmissionStatus = "new" | "read" | "resolved";
export type ContactSubmissionFilter = ContactSubmissionStatus | "all";

export type AdminContactSubmission = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  status: ContactSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type AdminContactSubmissionDetail = AdminContactSubmission & { message: string };

type ContactRow = {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  subject: string;
  status: ContactSubmissionStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type ContactDetailRow = ContactRow & { message: string };
export type ContactSubmissionCursor = { createdAt: string; id: string };

const CURSOR_PATTERN = /^[A-Za-z0-9_-]+$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function contactDto(row: ContactRow): AdminContactSubmission {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    subject: row.subject,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

export function encodeContactSubmissionCursor(cursor: ContactSubmissionCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function parseContactSubmissionCursor(value: string | null): ContactSubmissionCursor | null {
  if (!value || value.length > 400 || !CURSOR_PATTERN.test(value)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<ContactSubmissionCursor>;
    if (
      typeof parsed.createdAt !== "string"
      || !ISO_TIMESTAMP.test(parsed.createdAt)
      || !Number.isFinite(Date.parse(parsed.createdAt))
      || typeof parsed.id !== "string"
      || !UUID.test(parsed.id)
    ) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export async function listContactSubmissionsAdmin(args: {
  filter: ContactSubmissionFilter;
  cursor: ContactSubmissionCursor | null;
}) {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("contact_submissions")
    .select("id,name,email,topic,subject,status,created_at,updated_at,resolved_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(CONTACT_SUBMISSION_PAGE_SIZE);

  if (args.filter !== "all") query = query.eq("status", args.filter);
  if (args.cursor) {
    query = query.or(`created_at.lt.${args.cursor.createdAt},and(created_at.eq.${args.cursor.createdAt},id.lt.${args.cursor.id})`);
  }

  const { data, error } = await query;
  if (error) throw new Error("CONTACT_ADMIN_LIST_FAILED");
  const rows = (data ?? []) as ContactRow[];
  const last = rows.at(-1);
  return {
    items: rows.map(contactDto),
    nextCursor: rows.length === CONTACT_SUBMISSION_PAGE_SIZE && last
      ? encodeContactSubmissionCursor({ createdAt: last.created_at, id: last.id })
      : null,
  };
}

export async function getContactSubmissionAdmin(id: string): Promise<AdminContactSubmissionDetail | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contact_submissions")
    .select("id,name,email,topic,subject,message,status,created_at,updated_at,resolved_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("CONTACT_ADMIN_LOAD_FAILED");
  if (!data) return null;
  const row = data as ContactDetailRow;
  return { ...contactDto(row), message: row.message };
}

export async function setContactSubmissionStatusAdmin(args: {
  id: string;
  status: ContactSubmissionStatus;
  adminId: string;
}): Promise<AdminContactSubmissionDetail | null> {
  const admin = createSupabaseAdminClient();
  const timestamp = new Date().toISOString();
  const { data, error } = await admin
    .from("contact_submissions")
    .update({
      status: args.status,
      updated_at: timestamp,
      resolved_at: args.status === "resolved" ? timestamp : null,
    })
    .eq("id", args.id)
    .select("id,name,email,topic,subject,message,status,created_at,updated_at,resolved_at")
    .maybeSingle();
  if (error) throw new Error("CONTACT_ADMIN_STATUS_FAILED");
  if (!data) return null;

  const action = args.status === "resolved" ? "contact_resolve" : args.status === "read" ? "contact_read" : "contact_reopen";
  const { error: auditError } = await admin.from("admin_audit_log").insert({
    actor_user_id: args.adminId,
    action,
    result_code: args.status.toUpperCase(),
  });
  if (auditError) console.error("ADMIN_CONTACT_AUDIT_FAILED", { action });

  const row = data as ContactDetailRow;
  return { ...contactDto(row), message: row.message };
}
