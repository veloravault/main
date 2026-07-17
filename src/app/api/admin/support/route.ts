import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import { listSupportTicketsAdmin, parseSupportTicketCursor, type TicketStatus } from "@/lib/server/support-repository";

const ALLOWED_QUERY_KEYS = new Set(["status", "cursor"]);
const TICKET_STATUSES: readonly TicketStatus[] = ["open", "resolved"];

function invalidQuery() {
  return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => !ALLOWED_QUERY_KEYS.has(key))) return invalidQuery();
    if ([...ALLOWED_QUERY_KEYS].some((key) => params.getAll(key).length > 1)) return invalidQuery();

    const rawStatus = params.get("status");
    const status = rawStatus && TICKET_STATUSES.includes(rawStatus as TicketStatus) ? rawStatus as TicketStatus : null;
    if (rawStatus && !status) return invalidQuery();

    const rawCursor = params.get("cursor");
    const cursor = parseSupportTicketCursor(rawCursor);
    if (rawCursor && !cursor) return invalidQuery();

    return Response.json(await listSupportTicketsAdmin({ status, cursor }));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
