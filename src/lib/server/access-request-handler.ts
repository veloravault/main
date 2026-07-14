type AccessRequest = { fullName: string; email: string };
type FieldErrors = Partial<Record<"fullName" | "email" | "form", string>>;
type ParseResult = { ok: true; value: AccessRequest } | { ok: false; errors: FieldErrors };
type SafeRequestError = { code: string; status: number };

export type AccessRequestHandlerDependencies = {
  maxRequestBytes: number;
  after: (callback: () => void | Promise<void>) => void;
  assertSameOrigin: (request: Request) => void;
  readBoundedJson: (request: Request, maxBytes: number) => Promise<Record<string, unknown>>;
  parseAccessRequestInput: (input: unknown) => ParseResult;
  now: () => Date;
  accessRequestWindowStart: (now: Date) => string;
  fingerprintAccessRequest: (email: string, forwardedIp: string, windowStart: string) => string;
  fingerprintAccessRequestIp: (forwardedIp: string, windowStart: string) => string;
  accessRequestPairLimit: number;
  accessRequestIpLimit: number;
  consumeAccessRequestRateLimit: (fingerprint: string, windowStart: string, limit: number) => Promise<boolean>;
  insertAccessRequest: (input: AccessRequest) => Promise<void>;
  cleanupExpiredRateLimits: (cutoff: string) => Promise<void>;
  isRequestSecurityError: (error: unknown) => error is SafeRequestError;
};

const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1_000;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

function accepted() {
  return json({ accepted: true }, 202);
}

function scheduleCleanup(deps: AccessRequestHandlerDependencies, fingerprint: string, now: Date) {
  if (parseInt(fingerprint.slice(0, 2), 16) % 32 !== 0) return;
  const cutoff = new Date(now.getTime() - RATE_LIMIT_RETENTION_MS).toISOString();

  deps.after(async () => {
    try {
      await deps.cleanupExpiredRateLimits(cutoff);
    } catch {
      // Post-response cleanup is probabilistic and must remain best-effort.
    }
  });
}

export async function handleAccessRequest(request: Request, deps: AccessRequestHandlerDependencies) {
  try {
    deps.assertSameOrigin(request);
    const body = await deps.readBoundedJson(request, deps.maxRequestBytes);

    if (typeof body.website === "string" && body.website.trim()) return accepted();

    const parsed = deps.parseAccessRequestInput(body);
    if (!parsed.ok) return json({ code: "INVALID_REQUEST", errors: parsed.errors }, 400);

    const now = deps.now();
    const windowStart = deps.accessRequestWindowStart(now);
    const forwardedIp = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
    const ipFingerprint = deps.fingerprintAccessRequestIp(forwardedIp, windowStart);
    const pairFingerprint = deps.fingerprintAccessRequest(parsed.value.email, forwardedIp, windowStart);
    scheduleCleanup(deps, ipFingerprint, now);

    const ipAllowed = await deps.consumeAccessRequestRateLimit(
      ipFingerprint,
      windowStart,
      deps.accessRequestIpLimit,
    );
    if (!ipAllowed) return json({ code: "RATE_LIMITED" }, 429);

    const pairAllowed = await deps.consumeAccessRequestRateLimit(
      pairFingerprint,
      windowStart,
      deps.accessRequestPairLimit,
    );
    if (!pairAllowed) return json({ code: "RATE_LIMITED" }, 429);

    await deps.insertAccessRequest(parsed.value);
    return accepted();
  } catch (error) {
    if (deps.isRequestSecurityError(error)) {
      const code = error.status === 403
        ? "REQUEST_REJECTED"
        : error.status === 413
          ? "REQUEST_TOO_LARGE"
          : error.code;
      return json({ code }, error.status);
    }
    return json({ code: "REQUEST_UNAVAILABLE" }, 503);
  }
}
