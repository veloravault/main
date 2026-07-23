import { NextResponse } from "next/server";

const MAX_REPORT_BYTES = 8_192;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 20;
const MAX_TRACKED_CLIENTS = 5_000;

// In-memory, per-instance only - this endpoint has no database of its own
// (see the POST comment below), so a full durable limiter would be
// disproportionate to the actual risk (cheap log-flooding/cost, not data
// exposure). This still caps it without a DB round trip per violation report.
const hitsByClient = new Map<string, { count: number; windowStart: number }>();

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for");
  return forwarded?.split(",", 1)[0]?.trim() || "unknown-client";
}

function isRateLimited(address: string): boolean {
  const now = Date.now();
  if (hitsByClient.size > MAX_TRACKED_CLIENTS) {
    for (const [key, entry] of hitsByClient) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) hitsByClient.delete(key);
    }
  }
  const entry = hitsByClient.get(address);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    hitsByClient.set(address, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_PER_WINDOW;
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REPORT_BYTES) return null;

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REPORT_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// Public, unauthenticated sink for browser-generated Content-Security-Policy
// violation reports (report-uri, and report-to via the Reporting-Endpoints
// header). No state-changing action and no session is involved, so this
// intentionally has no origin/auth check - it only logs telemetry.
export async function POST(request: Request) {
  if (isRateLimited(clientAddress(request))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/csp-report" && mediaType !== "application/reports+json" && mediaType !== "application/json") {
    return NextResponse.json({ error: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
  }

  const text = await readBoundedBody(request);
  if (text === null) return NextResponse.json({ error: "INVALID_REPORT" }, { status: 400 });

  try {
    const parsed: unknown = JSON.parse(text);
    console.error("CSP_VIOLATION_REPORT", parsed);
  } catch {
    // Malformed report body - nothing to log, still acknowledge receipt.
  }

  return new NextResponse(null, { status: 204 });
}
