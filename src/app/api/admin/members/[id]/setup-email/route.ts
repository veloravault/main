import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import { sendMemberSetupEmailAdmin } from "@/lib/server/member-operations";
import { assertSameOrigin, readBoundedJson, RequestSecurityError } from "@/lib/server/request-security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    assertSameOrigin(request);
    const { id } = await context.params;
    if (!UUID.test(id)) return Response.json({ error: "INVALID_MEMBER_ID" }, { status: 400 });
    const body = await readBoundedJson(request, 256);
    if (Object.keys(body).length !== 0) return Response.json({ error: "INVALID_SETUP_EMAIL_REQUEST" }, { status: 400 });

    const result = await sendMemberSetupEmailAdmin({ adminId: admin.id, memberId: id });
    if (result.kind === "not_found") return Response.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
    if (result.kind === "protected") return Response.json({ error: "OWNER_MEMBER_PROTECTED" }, { status: 409 });
    if (result.kind === "conflict") return Response.json({ error: "MEMBER_SETUP_NOT_AVAILABLE" }, { status: 409 });
    if (result.kind === "rate_limited") return Response.json({ error: "SETUP_EMAIL_RATE_LIMITED" }, { status: 429 });
    if (result.kind === "unavailable") return Response.json({ error: "SETUP_EMAIL_UNAVAILABLE" }, { status: 503 });
    return Response.json({ sent: true });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof RequestSecurityError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
