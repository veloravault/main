import { vaultFetch } from "@/lib/authToken";

// Client-side helpers for R2 document storage. Each call hits a server route
// that authenticates the session and mints a short-lived presigned URL (or
// performs a server-side delete); R2 credentials never reach the browser.

export class StorageError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "StorageError";
  }
}

async function postJson(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await vaultFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new StorageError(
      typeof payload.error === "string" ? payload.error : "Storage request failed.",
      typeof payload.code === "string" ? payload.code : undefined,
    );
  }
  return payload;
}

/** Reserve a key and get a presigned PUT URL for a document of `byteLength`. */
export async function requestUploadUrl(byteLength: number): Promise<{ url: string; key: string }> {
  const payload = await postJson("/api/storage/upload-url", { byteLength });
  return { url: String(payload.url), key: String(payload.key) };
}

/** Get a presigned GET URL for one of the caller's own document keys. */
export async function requestDownloadUrl(key: string): Promise<string> {
  const payload = await postJson("/api/storage/download-url", { key });
  return String(payload.url);
}

/** Upload already-encrypted bytes to R2 via a presigned PUT URL. */
export async function uploadToPresignedUrl(url: string, body: ArrayBuffer | Uint8Array): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: body as BodyInit,
  });
  if (!response.ok) throw new StorageError(`Upload failed (${response.status}).`);
}

/** Download raw (still-encrypted) bytes from a presigned GET URL. */
export async function downloadFromPresignedUrl(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new StorageError(`Download failed (${response.status}).`);
  return response.arrayBuffer();
}

/** Delete one or more of the caller's document objects from R2. */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await postJson("/api/storage/delete", { keys });
}
