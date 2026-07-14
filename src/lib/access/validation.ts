import type { AccessRequestInput, InviteCursor, ParseResult } from "./types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAccessRequestInput(input: unknown): ParseResult<AccessRequestInput> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, errors: { form: "Enter your name and email." } };
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !["fullName", "email", "website"].includes(key))) return { ok: false, errors: { form: "The request contains unsupported fields." } };
  const fullName = typeof record.fullName === "string" ? record.fullName.trim().replace(/\s+/g, " ") : "";
  const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
  const errors: Record<string, string> = {};
  if (fullName.length < 2 || fullName.length > 100) errors.fullName = "Enter a name between 2 and 100 characters.";
  if (email.length > 254 || !EMAIL.test(email)) errors.email = "Enter a valid email address.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { fullName, email } };
}

export function parseAdminUserIds(value = "") {
  return new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter((item) => UUID.test(item)));
}

export function parseSafeNextPath(value: string | null | undefined) {
  return value === "/admin" || value === "/vault" ? value : "/vault";
}

export function encodeInviteCursor(value: InviteCursor) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function parseInviteCursor(value: string | null): InviteCursor | null {
  if (!value || value.length > 512) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (!("id" in parsed) || typeof parsed.id !== "string") return null;
    if (!("requestedAt" in parsed) || typeof parsed.requestedAt !== "string") return null;
    const { id, requestedAt } = parsed;
    return UUID.test(id) && !Number.isNaN(Date.parse(requestedAt)) ? { id, requestedAt } : null;
  } catch {
    return null;
  }
}
