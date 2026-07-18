import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import { getSupportTicketAdmin, postAdminReply } from "@/lib/server/support-repository";
import { assertSameOrigin, readBoundedJson, RequestSecurityError } from "@/lib/server/request-security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_BODY_BYTES = 8_192;
const MAX_MESSAGE_LENGTH = 4_000;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    assertSameOrigin(request);
    const { id } = await context.params;
    if (!UUID.test(id)) return Response.json({ error: "INVALID_TICKET_ID" }, { status: 400 });

    const body = await readBoundedJson(request, MAX_MESSAGE_BODY_BYTES);
    const keys = Object.keys(body);
    const rawBody = body.body;
    const message = typeof rawBody === "string" ? rawBody.trim() : "";
    if (keys.length !== 1 || keys[0] !== "body" || !message || message.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: "INVALID_MESSAGE" }, { status: 400 });
    }

    const existing = await getSupportTicketAdmin(id);
    if (!existing) return Response.json({ error: "TICKET_NOT_FOUND" }, { status: 404 });

    const reply = await postAdminReply({
      ticketId: id,
      body: message,
      adminId: admin.id,
      memberId: existing.ticket.userId,
    });
    return Response.json({ message: reply });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof RequestSecurityError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
