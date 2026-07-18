import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import {
  listContactSubmissionsAdmin,
  parseContactSubmissionCursor,
  type ContactSubmissionFilter,
} from "@/lib/server/contact-admin-repository";

const ALLOWED_QUERY_KEYS = new Set(["filter", "cursor"]);
const CONTACT_FILTERS: readonly ContactSubmissionFilter[] = ["new", "read", "resolved", "all"];

function invalidQuery() {
  return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => !ALLOWED_QUERY_KEYS.has(key))) return invalidQuery();
    if ([...ALLOWED_QUERY_KEYS].some((key) => params.getAll(key).length > 1)) return invalidQuery();

    const rawFilter = params.get("filter") ?? "new";
    const filter = CONTACT_FILTERS.includes(rawFilter as ContactSubmissionFilter)
      ? rawFilter as ContactSubmissionFilter
      : null;
    if (!filter) return invalidQuery();

    const rawCursor = params.get("cursor");
    const cursor = parseContactSubmissionCursor(rawCursor);
    if (rawCursor && !cursor) return invalidQuery();

    return Response.json(await listContactSubmissionsAdmin({ filter, cursor }));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
