import { ACCESS_REQUEST_STATUSES, type AccessRequestStatus } from "@/lib/access/types";
import { parseInviteCursor } from "@/lib/access/validation";
import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import { listAccessRequestsAdmin } from "@/lib/server/access-repository";

const ALLOWED_QUERY_KEYS = new Set(["status", "search", "cursor"]);
const SAFE_SEARCH = /^[\p{L}\p{M}\p{N}@._+ '\u2019-]{1,100}$/u;

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
    const status = rawStatus && ACCESS_REQUEST_STATUSES.includes(rawStatus as AccessRequestStatus)
      ? rawStatus as AccessRequestStatus
      : null;
    if (rawStatus && !status) return invalidQuery();

    const rawSearch = params.get("search");
    const search = rawSearch?.trim() || null;
    if (rawSearch !== null && (!search || !SAFE_SEARCH.test(search))) return invalidQuery();

    const rawCursor = params.get("cursor");
    const cursor = parseInviteCursor(rawCursor);
    if (rawCursor && !cursor) return invalidQuery();

    return Response.json(await listAccessRequestsAdmin({ status, search, cursor }));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
