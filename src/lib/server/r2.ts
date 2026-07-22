import "server-only";

import { AwsClient } from "aws4fetch";

// Cloudflare R2 access via its S3-compatible API. Credentials are server-only;
// the browser never sees them - it uploads/downloads through short-lived
// presigned URLs minted here. Documents are already client-side encrypted, so
// R2 only ever holds opaque ciphertext.

const DEFAULT_EXPIRES_IN = 300; // seconds

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_DOCUMENTS_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}

export function r2Configured(): boolean {
  return config() !== null;
}

function requireConfig() {
  const cfg = config();
  if (!cfg) throw new Error("R2_NOT_CONFIGURED");
  return cfg;
}

function client(cfg: { accessKeyId: string; secretAccessKey: string }) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(cfg: ReturnType<typeof requireConfig>, key: string) {
  // Keys may contain "/" segments; encode each segment but keep the slashes.
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${cfg.endpoint}/${cfg.bucket}/${encoded}`;
}

/** Presigned PUT URL the browser uses to upload one object directly to R2. */
export async function presignPut(key: string, expiresIn = DEFAULT_EXPIRES_IN): Promise<string> {
  const cfg = requireConfig();
  const url = `${objectUrl(cfg, key)}?X-Amz-Expires=${expiresIn}`;
  const signed = await client(cfg).sign(url, { method: "PUT", aws: { signQuery: true } });
  return signed.url;
}

/** Presigned GET URL the browser uses to download one object directly from R2. */
export async function presignGet(key: string, expiresIn = DEFAULT_EXPIRES_IN): Promise<string> {
  const cfg = requireConfig();
  const url = `${objectUrl(cfg, key)}?X-Amz-Expires=${expiresIn}`;
  const signed = await client(cfg).sign(url, { method: "GET", aws: { signQuery: true } });
  return signed.url;
}

/** Server-side delete of one or more objects. R2 does not bill delete ops. */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const cfg = requireConfig();
  const aws = client(cfg);
  await Promise.all(
    keys.map(async (key) => {
      const response = await aws.fetch(objectUrl(cfg, key), { method: "DELETE" });
      // R2 returns 204 for a successful delete and also for a missing key.
      if (!response.ok && response.status !== 404) {
        throw new Error(`R2 delete failed for ${key}: ${response.status}`);
      }
    }),
  );
}

/** All object keys under a prefix (used for account deletion cleanup). */
export async function listKeys(prefix: string): Promise<string[]> {
  const cfg = requireConfig();
  const aws = client(cfg);
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const params = new URLSearchParams({ "list-type": "2", prefix });
    if (continuationToken) params.set("continuation-token", continuationToken);
    const response = await aws.fetch(`${cfg.endpoint}/${cfg.bucket}?${params.toString()}`, { method: "GET" });
    if (!response.ok) throw new Error(`R2 list failed: ${response.status}`);
    const xml = await response.text();

    for (const match of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) {
      keys.push(decodeXmlEntities(match[1]));
    }

    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    continuationToken = truncated && tokenMatch ? decodeXmlEntities(tokenMatch[1]) : undefined;
  } while (continuationToken);

  return keys;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
