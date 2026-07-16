import { createHmac } from "node:crypto";

export class RequestSecurityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "RequestSecurityError";
    this.code = code;
    this.status = status;
  }
}

export function requiredAppUrl() {
  const value = process.env.APP_URL;
  if (!value) throw new Error("APP_URL_NOT_CONFIGURED");
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("APP_URL_INVALID");
  return url.origin;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  let parsedOrigin: string | null = null;
  try {
    parsedOrigin = origin ? new URL(origin).origin : null;
  } catch {
    parsedOrigin = null;
  }
  const expected = requiredAppUrl();
  if (!parsedOrigin || parsedOrigin !== expected) {
    console.error("ORIGIN_MISMATCH_DETAIL", { receivedOriginHeader: origin, parsedOrigin, expectedAppUrl: expected });
    throw new RequestSecurityError("ORIGIN_MISMATCH", 403);
  }
}

export function fingerprintAccessRequest(email: string, forwardedIp: string, windowStart: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedIp = normalizeForwardedIp(forwardedIp);
  return fingerprint(
    `access-request:email-ip:v1|${normalizedEmail}|${normalizedIp}|${windowStart}`,
  );
}

export function fingerprintAccessRequestIp(forwardedIp: string, windowStart: string) {
  const normalizedIp = normalizeForwardedIp(forwardedIp);
  return fingerprint(`access-request:ip:v1|${normalizedIp}|${windowStart}`);
}

function normalizeForwardedIp(forwardedIp: string) {
  return forwardedIp.split(",", 1)[0]?.trim().toLowerCase() || "unknown";
}

function fingerprint(value: string) {
  const secret = process.env.ACCESS_REQUEST_HMAC_SECRET?.trim();
  if (!secret) throw new Error("ACCESS_REQUEST_HMAC_SECRET_NOT_CONFIGURED");
  return createHmac("sha256", secret)
    .update(value)
    .digest("hex");
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("INVALID_BODY_LIMIT");

  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new RequestSecurityError("UNSUPPORTED_MEDIA_TYPE", 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestSecurityError("PAYLOAD_TOO_LARGE", 413);
  }

  const reader = request.body?.getReader();
  if (!reader) throw new RequestSecurityError("INVALID_JSON", 400);

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RequestSecurityError("PAYLOAD_TOO_LARGE", 413);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new RequestSecurityError("INVALID_JSON", 400);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestSecurityError) throw error;
    throw new RequestSecurityError("INVALID_JSON", 400);
  }
}
