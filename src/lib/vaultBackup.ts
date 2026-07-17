"use client";

import { supabase } from "@/lib/supabase";
import { downloadFromPresignedUrl, requestDownloadUrl } from "@/lib/r2Client";

export interface BackupManifest {
  format: "telkarvault";
  version: 1;
  exportedAt: string;
  appVersion: string;
  counts: Record<"passwords" | "documents" | "notes" | "wallet", number>;
  sha256: string;
}

export interface EncryptedVaultBackup {
  manifest: BackupManifest;
  records: Record<string, unknown[]>;
  documentBlobs: Array<{ storagePath: string; base64Ciphertext: string }>;
}

export class BackupExportError extends Error {
  constructor(message: string, public documentTitle?: string) {
    super(message);
    this.name = "BackupExportError";
  }
}

function bytesToBase64(bytes: Uint8Array) {
  let output = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(output);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function exportEncryptedVaultBackup(onProgress?: (completed: number, total: number) => void): Promise<{ backup: EncryptedVaultBackup; filename: string }> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new BackupExportError("Sign in again before exporting your vault.");

  const [passwords, documents, notes, wallet] = await Promise.all([
    supabase.from("vault_items").select("*"),
    supabase.from("vault_documents").select("*"),
    supabase.from("secure_notes").select("*"),
    supabase.from("secure_wallet").select("*"),
  ]);
  const queryError = passwords.error ?? documents.error ?? notes.error ?? wallet.error;
  if (queryError) throw new BackupExportError(queryError.message);

  const documentRows = (documents.data ?? []) as Array<{ title?: string; storage_path?: string }>;
  const documentBlobs: EncryptedVaultBackup["documentBlobs"] = [];
  onProgress?.(0, documentRows.length);
  for (let index = 0; index < documentRows.length; index += 1) {
    const document = documentRows[index];
    if (!document.storage_path) throw new BackupExportError("A document is missing its encrypted storage path.", document.title);
    let encryptedBuffer: ArrayBuffer;
    try {
      const downloadUrl = await requestDownloadUrl(document.storage_path);
      encryptedBuffer = await downloadFromPresignedUrl(downloadUrl);
    } catch {
      throw new BackupExportError("The encrypted document could not be retrieved. No partial backup was created.", document.title);
    }
    documentBlobs.push({ storagePath: document.storage_path, base64Ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)) });
    onProgress?.(index + 1, documentRows.length);
  }

  const records = {
    vault_items: passwords.data ?? [],
    vault_documents: documents.data ?? [],
    secure_notes: notes.data ?? [],
    secure_wallet: wallet.data ?? [],
  };
  const exportedAt = new Date().toISOString();
  const unsigned: EncryptedVaultBackup = {
    manifest: {
      format: "telkarvault",
      version: 1,
      exportedAt,
      appVersion: "0.1.0",
      counts: {
        passwords: records.vault_items.length,
        documents: records.vault_documents.length,
        notes: records.secure_notes.length,
        wallet: records.secure_wallet.length,
      },
      sha256: "",
    },
    records,
    documentBlobs,
  };
  const digest = await sha256(JSON.stringify(unsigned));
  const backup = { ...unsigned, manifest: { ...unsigned.manifest, sha256: digest } };
  return { backup, filename: `velora-vault-${exportedAt.slice(0, 10)}.telkarvault` };
}

export function downloadEncryptedVaultBackup(backup: EncryptedVaultBackup, filename: string) {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
