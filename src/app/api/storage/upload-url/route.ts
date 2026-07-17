import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { getDocumentQuota } from "@/lib/server/accountUsage";
import { presignPut, r2Configured } from "@/lib/server/r2";
import { InvalidJsonBodyError, PayloadTooLargeError, readBoundedJson } from "@/lib/server/requestBody";

const MAX_BODY_BYTES = 4_096;

export async function POST(req: NextRequest) {
  try {
    if (!r2Configured()) {
      return NextResponse.json({ error: "Document storage is not configured." }, { status: 503 });
    }

    const user = await authenticateActiveMemberRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await readBoundedJson(req, MAX_BODY_BYTES);
    const byteLength = Number(body.byteLength);
    if (!Number.isFinite(byteLength) || byteLength <= 0) {
      return NextResponse.json({ error: "A positive byteLength is required." }, { status: 400 });
    }

    const quota = await getDocumentQuota(user.id);

    if (quota.limitBytes === 0) {
      return NextResponse.json(
        { error: "Documents are not included on the Free plan. Upgrade to Plus to store documents.", code: "PLAN_REQUIRES_UPGRADE" },
        { status: 403 },
      );
    }
    if (quota.usedBytes + byteLength > quota.limitBytes) {
      return NextResponse.json(
        { error: "This upload would exceed your storage limit. Free up space or upgrade your plan.", code: "STORAGE_LIMIT" },
        { status: 403 },
      );
    }

    const key = `${user.id}/${Date.now()}-${randomUUID()}.enc`;
    const url = await presignPut(key);
    return NextResponse.json({ url, key });
  } catch (error: unknown) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    console.error("upload-url failed:", error);
    return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 });
  }
}
