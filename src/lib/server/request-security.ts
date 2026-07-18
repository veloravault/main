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

function normalizedOrigin(value: string | null) {
  if (!value || value === "null") return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function trustedRequestOrigins(request: Request): ReadonlySet<string> {
  return new Set([requiredAppUrl(), new URL(request.url).origin]);
}

export function assertSameOrigin(request: Request) {
  const trustedOrigins = trustedRequestOrigins(request);
  const origin = request.headers.get("origin");
  const parsedOrigin = normalizedOrigin(origin);
  if (parsedOrigin && trustedOrigins.has(parsedOrigin)) return;

  // Some browsers (observed: Brave) send a literal "null" Origin on certain
  // top-level form-POST navigations, e.g. when the page was reached from an
  // external context like a webmail link. Origin isn't available then, so
  // fall back to Referer, which browsers still populate for genuine
  // same-origin navigations under the default Referrer-Policy.
  const referer = request.headers.get("referer");
  const parsedReferer = normalizedOrigin(referer);
  if (parsedReferer && trustedOrigins.has(parsedReferer)) return;

  console.error("ORIGIN_MISMATCH_DETAIL", {
    receivedOriginHeader: origin,
    parsedOrigin,
    receivedRefererHeader: referer,
    parsedReferer,
    trustedOrigins: [...trustedOrigins],
  });
  throw new RequestSecurityError("ORIGIN_MISMATCH", 403);
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
