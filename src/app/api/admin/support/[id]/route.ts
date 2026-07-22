import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import { getSupportTicketAdmin, setSupportTicketStatusAdmin, type TicketStatus } from "@/lib/server/support-repository";
import { assertSameOrigin, readBoundedJson, RequestSecurityError } from "@/lib/server/request-security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_STATUS_BODY_BYTES = 256;
const TICKET_STATUSES: readonly TicketStatus[] = ["open", "resolved"];

function failureResponse(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof RequestSecurityError) {
    return Response.json({ error: error.code }, { status: error.status });
  }
  return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    if (!UUID.test(id)) return Response.json({ error: "INVALID_TICKET_ID" }, { status: 400 });

    const result = await getSupportTicketAdmin(id);
    if (!result) return Response.json({ error: "TICKET_NOT_FOUND" }, { status: 404 });
    return Response.json(result);
  } catch (error) {
    return failureResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    assertSameOrigin(request);
    const { id } = await context.params;
    if (!UUID.test(id)) return Response.json({ error: "INVALID_TICKET_ID" }, { status: 400 });

    const body = await readBoundedJson(request, MAX_STATUS_BODY_BYTES);
    const keys = Object.keys(body);
    const status = body.status;
    if (keys.length !== 1 || keys[0] !== "status" || !TICKET_STATUSES.includes(status as TicketStatus)) {
      return Response.json({ error: "INVALID_STATUS_UPDATE" }, { status: 400 });
    }

    const result = await setSupportTicketStatusAdmin({ ticketId: id, status: status as TicketStatus, adminId: admin.id });
    if (result.outcome === "not_found") return Response.json({ error: "TICKET_NOT_FOUND" }, { status: 404 });
    if (result.outcome === "unseen_member_reply") return Response.json({ error: "SUPPORT_UNSEEN_MEMBER_REPLY" }, { status: 409 });
    return Response.json({ ticket: result.ticket });
  } catch (error) {
    return failureResponse(error);
  }
}
