import { NextRequest, NextResponse } from "next/server";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { getDocumentQuota } from "@/lib/server/accountUsage";
import { deleteObjects, headObject, r2Configured } from "@/lib/server/r2";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { InvalidJsonBodyError, PayloadTooLargeError, readBoundedJson } from "@/lib/server/requestBody";

const MAX_BODY_BYTES = 4_096;

// upload-url's quota pre-check only has the browser's claimed byteLength to
// go on, and the presigned PUT it mints has no Content-Length constraint - a
// caller can under-report the size there, then stream an arbitrarily large
// file to R2, and finally have inserted a vault_documents row with whatever
// size_bytes they like (both the pre-check and the enforce_document_quota
// trigger only ever saw that claimed value). This route is the one place
// that inserts the row, using the object's REAL size read back from R2, and
// direct authenticated INSERT/UPDATE on vault_documents is revoked in
// 20260724070000_restrict_vault_documents_write_grants.sql so this check
// can't be bypassed by calling the Data API directly.
export async function POST(req: NextRequest) {
  try {
    if (!r2Configured()) {
      return NextResponse.json({ error: "Document storage is not configured." }, { status: 503 });
    }

    const user = await authenticateActiveMemberRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await readBoundedJson(req, MAX_BODY_BYTES);
    const key = typeof body.key === "string" ? body.key : "";
    const title = typeof body.title === "string" ? body.title : "";
    const iv = typeof body.iv === "string" ? body.iv : "";
    const salt = typeof body.salt === "string" ? body.salt : "";
    const category = typeof body.category === "string" ? body.category : null;

    // Ownership is a path-prefix check: every key is minted as `${userId}/...`.
    if (!key || !key.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    if (!title || !iv || !salt) {
      return NextResponse.json({ error: "title, iv, and salt are required." }, { status: 400 });
    }

    const object = await headObject(key);
    if (!object) {
      return NextResponse.json({ error: "The uploaded file could not be found." }, { status: 404 });
    }

    const quota = await getDocumentQuota(user.id);
    if (quota.limitBytes === 0 || quota.usedBytes + object.sizeBytes > quota.limitBytes) {
      await deleteObjects([key]).catch(() => undefined);
      return NextResponse.json(
        { error: "This upload would exceed your storage limit. Free up space or upgrade your plan.", code: "STORAGE_LIMIT" },
        { status: 403 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("vault_documents")
      .insert({
        user_id: user.id,
        title,
        storage_path: key,
        iv,
        salt,
        category,
        size_bytes: object.sizeBytes,
      })
      .select("id, title, storage_path, iv, salt, category")
      .single();

    if (error) {
      // The DB quota trigger is the final guard; if it rejects the row after
      // the blob landed in R2 (e.g. a concurrent upload used up the last of
      // the quota first), delete the orphan so storage doesn't leak.
      await deleteObjects([key]).catch(() => undefined);
      console.error("confirm-upload insert failed:", error);
      return NextResponse.json({ error: "Storage limit reached. Free up space or upgrade your plan." }, { status: 403 });
    }

    return NextResponse.json({ document: data });
  } catch (error: unknown) {
    if (error instanceof PayloadTooLargeError) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    console.error("confirm-upload failed:", error);
    return NextResponse.json({ error: "Could not finish the upload." }, { status: 500 });
  }
}
