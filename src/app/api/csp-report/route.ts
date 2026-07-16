import { NextResponse } from "next/server";

const MAX_REPORT_BYTES = 8_192;

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
// intentionally has no origin/auth check — it only logs telemetry.
export async function POST(request: Request) {
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
    // Malformed report body — nothing to log, still acknowledge receipt.
  }

  return new NextResponse(null, { status: 204 });
}
