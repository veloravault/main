import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import { getAdminOverview } from "@/lib/server/admin-overview-repository";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    if (new URL(request.url).search) {
      return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
    }
    return Response.json(await getAdminOverview());
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
