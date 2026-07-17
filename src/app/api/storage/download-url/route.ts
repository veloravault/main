import { NextRequest, NextResponse } from "next/server";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { presignGet, r2Configured } from "@/lib/server/r2";
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
    const key = typeof body.key === "string" ? body.key : "";

    // Ownership is a path-prefix check: every key is minted as `${userId}/...`.
    if (!key || !key.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const url = await presignGet(key);
    return NextResponse.json({ url });
  } catch (error: unknown) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    console.error("download-url failed:", error);
    return NextResponse.json({ error: "Could not prepare the download." }, { status: 500 });
  }
}
