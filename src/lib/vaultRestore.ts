"use client";

import { supabase } from "@/lib/supabase";
import { decryptText } from "@/lib/crypto";
import { requestUploadUrl, uploadToPresignedUrl } from "@/lib/r2Client";
import type { BackupManifest, EncryptedVaultBackup } from "@/lib/vaultBackup";

export class BackupRestoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupRestoreError";
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface ParsedBackup {
  backup: EncryptedVaultBackup;
  manifest: BackupManifest;
}

/** Parses and validates a .telkarvault file: JSON shape, format/version, and integrity digest. */
export async function parseVaultBackupFile(file: File): Promise<ParsedBackup> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new BackupRestoreError("The file could not be read.");
  }

  let parsed: EncryptedVaultBackup;
  try {
    parsed = JSON.parse(text) as EncryptedVaultBackup;
  } catch {
    throw new BackupRestoreError("This file is not a valid backup — it isn't valid JSON.");
  }

  const manifest = parsed?.manifest;
  if (!manifest || manifest.format !== "telkarvault" || manifest.version !== 1) {
    throw new BackupRestoreError("This file is not a Velora Vault backup.");
  }
  if (!parsed.records || typeof parsed.records !== "object" || !Array.isArray(parsed.documentBlobs)) {
    throw new BackupRestoreError("This backup file is missing its records.");
  }

  const unsigned = { ...parsed, manifest: { ...manifest, sha256: "" } };
  const digest = await sha256(JSON.stringify(unsigned));
  if (digest !== manifest.sha256) {
    throw new BackupRestoreError("This backup file's integrity check failed — it may be damaged or altered.");
  }

  return { backup: parsed, manifest };
}

/**
 * Best-effort check that the current master key can actually read this
 * backup: tries to decrypt the first password or note record. A pure
 * heuristic (a single row could be corrupt for unrelated reasons) — callers
 * should warn, not block, on a negative result.
 */
export async function backupMatchesMasterKey(backup: EncryptedVaultBackup, masterPassword: string): Promise<boolean> {
  const passwords = (backup.records.vault_items ?? []) as Array<{ encrypted_data?: string; salt?: string; iv?: string }>;
  const notes = (backup.records.secure_notes ?? []) as Array<{ encrypted_content?: string; salt?: string; iv?: string }>;
  const sample = passwords.find((row) => row.encrypted_data && row.salt && row.iv)
    ?? notes.find((row) => row.encrypted_content && row.salt && row.iv);
  if (!sample) return true; // Nothing to check (e.g. a wallet/documents-only backup) — don't warn without evidence.
  const ciphertext = (sample as { encrypted_data?: string }).encrypted_data ?? (sample as { encrypted_content?: string }).encrypted_content;
  if (!ciphertext || !sample.salt || !sample.iv) return true;
  try {
    await decryptText(ciphertext, sample.salt, sample.iv, masterPassword);
    return true;
  } catch {
    return false;
  }
}

export interface RestoreProgress {
  stage: "documents" | "passwords" | "notes" | "wallet";
  completed: number;
  total: number;
}

export interface RestoreResult {
  restored: { passwords: number; documents: number; notes: number; wallet: number };
  errors: string[];
}

/**
 * Re-inserts every record from a validated backup as NEW rows under the
 * current signed-in user (never the backup file's own user_id). Documents
 * are re-uploaded to fresh R2 keys — old paths from the file aren't reused,
 * since the original blobs may no longer exist. This adds to the vault; it
 * never overwrites or deduplicates against existing items.
 */
export async function restoreVaultBackup(backup: EncryptedVaultBackup, onProgress?: (progress: RestoreProgress) => void): Promise<RestoreResult> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new BackupRestoreError("Sign in again before restoring your vault.");
  const userId = auth.user.id;

  const errors: string[] = [];
  const restored = { passwords: 0, documents: 0, notes: 0, wallet: 0 };

  const documentRows = (backup.records.vault_documents ?? []) as Array<Record<string, unknown>>;
  const blobsByPath = new Map(backup.documentBlobs.map((blob) => [blob.storagePath, blob.base64Ciphertext]));
  onProgress?.({ stage: "documents", completed: 0, total: documentRows.length });
  for (let index = 0; index < documentRows.length; index += 1) {
    const row = documentRows[index];
    const title = String(row.title ?? "Untitled document");
    const oldPath = row.storage_path as string | undefined;
    const ciphertextBase64 = oldPath ? blobsByPath.get(oldPath) : undefined;
    if (!ciphertextBase64) {
      errors.push(`Document "${title}" is missing its encrypted contents in this backup and was skipped.`);
      onProgress?.({ stage: "documents", completed: index + 1, total: documentRows.length });
      continue;
    }
    try {
      const bytes = base64ToBytes(ciphertextBase64);
      const { url, key } = await requestUploadUrl(bytes.byteLength);
      await uploadToPresignedUrl(url, bytes);
      const { error } = await supabase.from("vault_documents").insert({
        user_id: userId,
        title,
        storage_path: key,
        iv: row.iv,
        salt: row.salt,
        category: row.category ?? "Uncategorized",
        size_bytes: bytes.byteLength,
      });
      if (error) throw error;
      restored.documents += 1;
    } catch (err) {
      errors.push(`Document "${title}" could not be restored: ${err instanceof Error ? err.message : "unknown error"}.`);
    }
    onProgress?.({ stage: "documents", completed: index + 1, total: documentRows.length });
  }

  const passwordRows = (backup.records.vault_items ?? []) as Array<Record<string, unknown>>;
  onProgress?.({ stage: "passwords", completed: 0, total: passwordRows.length });
  for (let index = 0; index < passwordRows.length; index += 1) {
    const row = passwordRows[index];
    const { error } = await supabase.from("vault_items").insert({
      user_id: userId,
      title: row.title,
      encrypted_data: row.encrypted_data,
      iv: row.iv,
      salt: row.salt,
      category: row.category ?? "Uncategorized",
      domain: row.domain ?? null,
      is_favorite: false,
    });
    if (error) errors.push(`Password "${String(row.title ?? "untitled")}" could not be restored: ${error.message}`);
    else restored.passwords += 1;
    onProgress?.({ stage: "passwords", completed: index + 1, total: passwordRows.length });
  }

  const noteRows = (backup.records.secure_notes ?? []) as Array<Record<string, unknown>>;
  onProgress?.({ stage: "notes", completed: 0, total: noteRows.length });
  for (let index = 0; index < noteRows.length; index += 1) {
    const row = noteRows[index];
    const { error } = await supabase.from("secure_notes").insert({
      user_id: userId,
      title: row.title,
      encrypted_content: row.encrypted_content,
      iv: row.iv,
      salt: row.salt,
      category: row.category ?? "Uncategorized",
    });
    if (error) errors.push(`Note "${String(row.title ?? "untitled")}" could not be restored: ${error.message}`);
    else restored.notes += 1;
    onProgress?.({ stage: "notes", completed: index + 1, total: noteRows.length });
  }

  const walletRows = (backup.records.secure_wallet ?? []) as Array<Record<string, unknown>>;
  onProgress?.({ stage: "wallet", completed: 0, total: walletRows.length });
  for (let index = 0; index < walletRows.length; index += 1) {
    const row = walletRows[index];
    const { error } = await supabase.from("secure_wallet").insert({
      user_id: userId,
      title: row.title,
      type: row.type,
      encrypted_content: row.encrypted_content,
      iv: row.iv,
      salt: row.salt,
    });
    if (error) errors.push(`Wallet item "${String(row.title ?? "untitled")}" could not be restored: ${error.message}`);
    else restored.wallet += 1;
    onProgress?.({ stage: "wallet", completed: index + 1, total: walletRows.length });
  }

  return { restored, errors };
}
