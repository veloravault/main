import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import { listBillingReconciliationIssuesAdmin, parseBillingReconciliationCursor, type BillingReconciliationFilter } from "@/lib/server/billing-reconciliation-repository";

const ALLOWED_QUERY_KEYS = new Set(["filter", "cursor"]);
const FILTERS: readonly BillingReconciliationFilter[] = ["pending", "resolved", "all"];

function invalidQuery() {
  return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => !ALLOWED_QUERY_KEYS.has(key))) return invalidQuery();
    if (params.getAll("filter").length > 1 || params.getAll("cursor").length > 1) return invalidQuery();

    const rawFilter = params.get("filter") ?? "pending";
    const filter = FILTERS.includes(rawFilter as BillingReconciliationFilter) ? rawFilter as BillingReconciliationFilter : null;
    if (!filter) return invalidQuery();
    const rawCursor = params.get("cursor");
    if (rawCursor && !parseBillingReconciliationCursor(rawCursor)) return invalidQuery();

    return Response.json(await listBillingReconciliationIssuesAdmin({ filter, cursor: parseBillingReconciliationCursor(rawCursor) }));
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
