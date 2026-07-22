# Cloudflare R2 for document storage - design

Date: 2026-07-17

## Goal

Move **document** blob storage from Supabase Storage to Cloudflare R2.
Avatars stay on Supabase Storage for now. Documents are already
client-side encrypted, so R2 only ever holds opaque ciphertext.

Start fresh: existing Supabase document blobs are **not** migrated.

## Constraints

- R2 credentials are server-only - never sent to the browser.
- Browser moves bytes via short-lived **presigned URLs** (SigV4, `aws4fetch`).
- Reuse existing auth (`authenticateActiveMemberRequest`) and the plan model.
- The document quota trigger + AI limiting are Postgres-side and stay untouched;
  they key off the `vault_documents` metadata row, not the blob location.

## Config

Env (server-only): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_DOCUMENTS_BUCKET`. Endpoint = `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`,
region `auto`, service `s3`. Bucket CORS allows the app origins for GET/PUT.

## Server module - `src/lib/server/r2.ts`

Wraps an `aws4fetch.AwsClient`:
- `presignPut(key, { contentType?, expiresIn })` → presigned PUT URL.
- `presignGet(key, { expiresIn })` → presigned GET URL.
- `deleteObjects(keys[])` → signed `DELETE` per key (R2 delete is free).
- `listKeys(prefix)` → signed `ListObjectsV2`, returns all keys under prefix.
- `r2Configured()` → boolean, so routes can 503 cleanly if env is missing.

Keys are always `${userId}/...` so ownership is a path-prefix check.

## API routes (Node runtime)

- `POST /api/storage/upload-url` - body `{ contentType, byteLength }`.
  Auth → read caller's `plan` + current document byte sum (admin client).
  Reject **free** (403 `PLAN_REQUIRES_UPGRADE`) and **over-quota**
  (403 `STORAGE_LIMIT`) before issuing anything. Otherwise generate
  `${userId}/${timestamp}-${rand}.enc`, presign PUT, return `{ url, key }`.
- `POST /api/storage/download-url` - body `{ key }`. Auth → verify
  `key` starts with `${userId}/` → presign GET → `{ url }`.
- `POST /api/storage/delete` - body `{ keys: string[] }`. Auth → verify every
  key is under `${userId}/` → `deleteObjects` → `{ ok: true }`.

Randomness for the key comes from `crypto.randomUUID()` on the server.

## Client helper - `src/lib/r2Client.ts`

Thin wrappers over `vaultFetch`: `requestUploadUrl(contentType, byteLength)`,
`requestDownloadUrl(key)`, `deleteObjects(keys)`. Returns typed results and maps
403 codes to friendly messages (upgrade / storage full).

## Client rewrites (replace `supabase.storage`)

- `DocumentVault.tsx`
  - Upload: `requestUploadUrl` → `PUT` ciphertext to the presigned URL →
    insert `vault_documents` row with `storage_path = key` and `size_bytes`
    (trigger still enforces quota). On row-insert failure, `deleteObjects([key])`
    to clean the orphan. Surface 403 upgrade/quota messages.
  - Download + preview: `requestDownloadUrl` → `fetch` → decrypt.
  - Single + bulk delete: `deleteObjects` then delete the row(s).
- `vaultBackup.ts` - fetch each document blob via `requestDownloadUrl`.
- `DangerSettings.tsx` - delete-all documents through the delete route
  (client has no R2 creds).
- `src/app/api/delete-account/route.ts` - replace Supabase `vault_documents`
  bucket cleanup with R2 `listKeys(userId + '/')` + `deleteObjects`. Avatar
  cleanup (Supabase) stays.

## Out of scope

- Avatars (stay on Supabase Storage).
- Migrating existing Supabase document blobs (start fresh).
- Dropping the now-dormant Supabase `vault_documents` bucket/policies
  (leave for a later cleanup once R2 is confirmed).
- Multipart upload for very large files (single PUT is fine within the 5 GB plan).

## Verification

- `npm run build` clean.
- Live: sign in, upload a document (paid plan) → appears, previews, downloads;
  delete removes it from R2; free plan upload is refused with the upgrade
  message; over-quota refused.
