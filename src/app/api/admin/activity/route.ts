import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import {
  listAdminActivity,
  parseAdminActivityCursor,
  type AdminActivityCategory,
  type AdminActivityResult,
} from "@/lib/server/access-repository";

const CATEGORIES: readonly AdminActivityCategory[] = ["all", "access", "support", "invitation", "billing", "system"];
const RESULTS: readonly AdminActivityResult[] = ["all", "success", "failure"];

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const allowedKeys = new Set(["cursor", "category", "result"]);
    if ([...params.keys()].some((key) => !allowedKeys.has(key)) || [...allowedKeys].some((key) => params.getAll(key).length > 1)) {
      return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
    }

    const rawCursor = params.get("cursor");
    const cursor = parseAdminActivityCursor(rawCursor);
    if (rawCursor && !cursor) return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
    const rawCategory = params.get("category") ?? "all";
    const rawResult = params.get("result") ?? "all";
    if (!CATEGORIES.includes(rawCategory as AdminActivityCategory) || !RESULTS.includes(rawResult as AdminActivityResult)) {
      return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
    }
    const category = rawCategory as AdminActivityCategory;
    const result = rawResult as AdminActivityResult;

    return Response.json(await listAdminActivity({ cursor, category, result }));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
