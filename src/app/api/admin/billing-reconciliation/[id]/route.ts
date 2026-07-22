import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import { resolveBillingReconciliationIssueAdmin } from "@/lib/server/billing-reconciliation-repository";
import { assertSameOrigin, RequestSecurityError } from "@/lib/server/request-security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    assertSameOrigin(request);
    const { id } = await context.params;
    if (!UUID.test(id)) return Response.json({ error: "INVALID_ISSUE_ID" }, { status: 400 });

    const result = await resolveBillingReconciliationIssueAdmin({ id, adminId: admin.id });
    if (result.outcome === "not_found") return Response.json({ error: "ISSUE_NOT_FOUND" }, { status: 404 });
    if (result.outcome === "already_resolved") return Response.json({ error: "ISSUE_ALREADY_RESOLVED" }, { status: 409 });
    if (result.outcome === "subscription_not_found") return Response.json({ error: "SUBSCRIPTION_NOT_FOUND" }, { status: 409 });
    return Response.json({ issue: result.issue });
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof RequestSecurityError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
  }
}
