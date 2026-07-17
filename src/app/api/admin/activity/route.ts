import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import {
  listAdminActivity,
  parseAdminActivityCursor,
} from "@/lib/server/access-repository";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => key !== "cursor") || params.getAll("cursor").length > 1) {
      return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
    }

    const rawCursor = params.get("cursor");
    const cursor = parseAdminActivityCursor(rawCursor);
    if (rawCursor && !cursor) return Response.json({ error: "INVALID_QUERY" }, { status: 400 });

    return Response.json(await listAdminActivity({ cursor }));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
