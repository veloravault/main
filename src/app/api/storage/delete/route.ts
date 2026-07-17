import { NextRequest, NextResponse } from "next/server";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { deleteObjects, r2Configured } from "@/lib/server/r2";
import { InvalidJsonBodyError, PayloadTooLargeError, readBoundedJson } from "@/lib/server/requestBody";

const MAX_BODY_BYTES = 64_000;
const MAX_KEYS = 1_000;

export async function POST(req: NextRequest) {
  try {
    if (!r2Configured()) {
      return NextResponse.json({ error: "Document storage is not configured." }, { status: 503 });
    }

    const user = await authenticateActiveMemberRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await readBoundedJson(req, MAX_BODY_BYTES);
    const rawKeys = Array.isArray(body.keys) ? body.keys : [];
    if (rawKeys.length === 0 || rawKeys.length > MAX_KEYS) {
      return NextResponse.json({ error: "Provide 1 to 1000 keys." }, { status: 400 });
    }

    const prefix = `${user.id}/`;
    const keys = rawKeys.filter((key): key is string => typeof key === "string" && key.startsWith(prefix));
    // Reject the whole request if any key is not the caller's — no partial trust.
    if (keys.length !== rawKeys.length) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await deleteObjects(keys);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    console.error("storage delete failed:", error);
    return NextResponse.json({ error: "Could not delete the files." }, { status: 500 });
  }
}
