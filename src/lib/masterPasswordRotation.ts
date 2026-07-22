import { supabase } from "@/lib/supabase";
import { encryptText, decryptText, encryptFile, decryptFile } from "@/lib/crypto";
import { requestDownloadUrl, downloadFromPresignedUrl, requestUploadUrl, uploadToPresignedUrl, deleteObjects } from "@/lib/r2Client";
import { chunkKeys } from "@/lib/chunkKeys";

export type RotationStage = "items" | "notes" | "wallet" | "documents" | "committing" | "cleanup";

export interface RotationProgress {
  stage: RotationStage;
  completed: number;
  total: number;
}

export class MasterPasswordRotationError extends Error {}

type ItemRow = { id: string; encrypted_data: string; iv: string; salt: string };
type NoteRow = { id: string; encrypted_content: string; iv: string; salt: string };
type WalletRow = { id: string; encrypted_content: string; iv: string; salt: string };
type DocumentRow = { id: string; storage_path: string; iv: string; salt: string };

/**
 * Re-encrypts the entire vault (passwords, notes, wallet/bank, documents)
 * under `newPassword` and commits it via a single atomic Postgres function.
 * Nothing is written to the database until every row has been successfully
 * decrypted and re-encrypted in memory - if any decrypt/encrypt/upload step
 * throws, the function throws before the rpc call and nothing changes.
 */
export async function rotateMasterPassword(
  oldPassword: string,
  newPassword: string,
  onProgress?: (progress: RotationProgress) => void,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new MasterPasswordRotationError("Sign in again before changing your master key.");

  const [itemsRes, notesRes, walletRes, documentsRes] = await Promise.all([
    supabase.from("vault_items").select("id,encrypted_data,iv,salt"),
    supabase.from("secure_notes").select("id,encrypted_content,iv,salt"),
    supabase.from("secure_wallet").select("id,encrypted_content,iv,salt"),
    supabase.from("vault_documents").select("id,storage_path,iv,salt"),
  ]);
  if (itemsRes.error || notesRes.error || walletRes.error || documentsRes.error) {
    throw new MasterPasswordRotationError("Could not read your vault. Nothing was changed.");
  }

  const items = (itemsRes.data ?? []) as ItemRow[];
  const notes = (notesRes.data ?? []) as NoteRow[];
  const wallet = (walletRes.data ?? []) as WalletRow[];
  const documents = (documentsRes.data ?? []) as DocumentRow[];
  const totalRows = items.length + notes.length + wallet.length + documents.length;
  let completed = 0;

  const rotatedItems = [];
  for (const row of items) {
    const plaintext = await decryptText(row.encrypted_data, row.salt, row.iv, oldPassword);
    const encrypted = await encryptText(plaintext, newPassword);
    rotatedItems.push({ id: row.id, encrypted_data: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt });
    completed += 1;
    onProgress?.({ stage: "items", completed, total: totalRows });
  }

  const rotatedNotes = [];
  for (const row of notes) {
    const plaintext = await decryptText(row.encrypted_content, row.salt, row.iv, oldPassword);
    const encrypted = await encryptText(plaintext, newPassword);
    rotatedNotes.push({ id: row.id, encrypted_content: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt });
    completed += 1;
    onProgress?.({ stage: "notes", completed, total: totalRows });
  }

  const rotatedWallet = [];
  for (const row of wallet) {
    const plaintext = await decryptText(row.encrypted_content, row.salt, row.iv, oldPassword);
    const encrypted = await encryptText(plaintext, newPassword);
    rotatedWallet.push({ id: row.id, encrypted_content: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt });
    completed += 1;
    onProgress?.({ stage: "wallet", completed, total: totalRows });
  }

  const rotatedDocuments = [];
  const oldDocumentKeys: string[] = [];
  for (const row of documents) {
    const downloadUrl = await requestDownloadUrl(row.storage_path);
    const encryptedBuffer = await downloadFromPresignedUrl(downloadUrl);
    const plainBuffer = await decryptFile(encryptedBuffer, row.salt, row.iv, oldPassword);
    const reEncrypted = await encryptFile(plainBuffer, newPassword);
    const { url, key } = await requestUploadUrl(reEncrypted.ciphertextBuffer.byteLength);
    await uploadToPresignedUrl(url, reEncrypted.ciphertextBuffer);
    rotatedDocuments.push({ id: row.id, storage_path: key, iv: reEncrypted.iv, salt: reEncrypted.salt });
    oldDocumentKeys.push(row.storage_path);
    completed += 1;
    onProgress?.({ stage: "documents", completed, total: totalRows });
  }

  onProgress?.({ stage: "committing", completed: totalRows, total: totalRows });
  const { error: rpcError } = await supabase.rpc("rotate_master_key_ciphertexts", {
    p_items: rotatedItems,
    p_notes: rotatedNotes,
    p_wallet: rotatedWallet,
    p_documents: rotatedDocuments,
  });
  if (rpcError) {
    if (rpcError.code === "P0001") {
      throw new MasterPasswordRotationError("Your vault changed while this was running. Nothing was changed - try again.");
    }
    throw new MasterPasswordRotationError("The change could not be saved. Nothing was changed.");
  }

  onProgress?.({ stage: "cleanup", completed: totalRows, total: totalRows });
  for (const chunk of chunkKeys(oldDocumentKeys)) {
    try {
      await deleteObjects(chunk);
    } catch {
      // Best-effort: the rotation itself already succeeded. A leftover old
      // R2 object is harmless (nothing in the DB points at it anymore).
    }
  }
}
