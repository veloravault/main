import { AuthorizationError, requireAdmin } from "@/lib/server/access";
import {
  getContactSubmissionAdmin,
  setContactSubmissionStatusAdmin,
  type ContactSubmissionStatus,
} from "@/lib/server/contact-admin-repository";
import { assertSameOrigin, readBoundedJson, RequestSecurityError } from "@/lib/server/request-security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_STATUS_BODY_BYTES = 256;
const CONTACT_STATUSES: readonly ContactSubmissionStatus[] = ["new", "read", "resolved"];

function failureResponse(error: unknown) {
  if (error instanceof AuthorizationError || error instanceof RequestSecurityError) {
    return Response.json({ error: error.code }, { status: error.status });
  }
  return Response.json({ error: "ADMIN_REQUEST_UNAVAILABLE" }, { status: 503 });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    if (!UUID.test(id)) return Response.json({ error: "INVALID_CONTACT_ID" }, { status: 400 });
    const submission = await getContactSubmissionAdmin(id);
    if (!submission) return Response.json({ error: "CONTACT_NOT_FOUND" }, { status: 404 });
    return Response.json({ submission });
  } catch (error) {
    return failureResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    assertSameOrigin(request);
    const { id } = await context.params;
    if (!UUID.test(id)) return Response.json({ error: "INVALID_CONTACT_ID" }, { status: 400 });

    const body = await readBoundedJson(request, MAX_STATUS_BODY_BYTES);
    const status = body.status;
    if (Object.keys(body).length !== 1 || typeof status !== "string" || !CONTACT_STATUSES.includes(status as ContactSubmissionStatus)) {
      return Response.json({ error: "INVALID_STATUS_UPDATE" }, { status: 400 });
    }

    const submission = await setContactSubmissionStatusAdmin({ id, status: status as ContactSubmissionStatus, adminId: admin.id });
    if (!submission) return Response.json({ error: "CONTACT_NOT_FOUND" }, { status: 404 });
    return Response.json({ submission });
  } catch (error) {
    return failureResponse(error);
  }
}
