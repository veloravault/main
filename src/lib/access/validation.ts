import type { InviteCursor } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
