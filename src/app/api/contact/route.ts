import { ContactValidationError, parseContactSubmission } from "@/lib/contact";
import { ContactRateLimitError, createContactSubmission } from "@/lib/server/contact-repository";
import { assertSameOrigin, readBoundedJson, RequestSecurityError } from "@/lib/server/request-security";

export const runtime = "nodejs";

const CONTACT_BODY_LIMIT = 8 * 1024;

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for");
  return forwarded?.split(",", 1)[0]?.trim() || "unknown-client";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload = await readBoundedJson(request, CONTACT_BODY_LIMIT);
    const submission = parseContactSubmission(payload);

    // Bots commonly fill hidden fields. Return the normal success shape without
    // storing anything so the field does not become an oracle for bypasses.
    if (submission.company) return Response.json({ ok: true });

    await createContactSubmission(submission, clientAddress(request));
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ContactValidationError) {
      return Response.json({ error: error.code }, { status: 400 });
    }
    if (error instanceof ContactRateLimitError) {
      return Response.json(
        { error: "CONTACT_RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }
    if (error instanceof RequestSecurityError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "CONTACT_SERVICE_UNAVAILABLE" }, { status: 503 });
  }
}
