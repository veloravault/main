"use client";

import { encryptText } from "@/lib/crypto";
import { invalidateCache } from "@/lib/vaultCache";
import { supabase } from "@/lib/supabase";
import { createImportHistoryEntry, saveImportHistory, type ImportHistoryEntry, type ImportHistoryOperation, type ImportTargetTable } from "@/lib/import/history";
import { CREDENTIAL_TYPE_CONFIGS, type CredentialType } from "@/lib/credentialTypes";
import type { ImportDraft, ImportSource } from "@/lib/import/types";

export interface ImportSaveFailure { clientId: string; title: string; message: string; }
export interface ImportSaveResult { history: ImportHistoryEntry; failures: ImportSaveFailure[]; }

const CREDENTIAL_TYPES = new Set(CREDENTIAL_TYPE_CONFIGS.map((config) => config.type));

function isCredentialType(type: ImportDraft["type"]): type is CredentialType {
  return CREDENTIAL_TYPES.has(type as CredentialType);
}

function targetFor(draft: ImportDraft): ImportTargetTable {
  if (draft.type === "password") return "vault_items";
  if (draft.type === "note") return "secure_notes";
  if (isCredentialType(draft.type)) return "secure_credentials";
  return "secure_wallet";
}

async function encryptedMutation(draft: ImportDraft, masterPassword: string, userId: string) {
  if (draft.type === "password") {
    const encrypted = await encryptText(JSON.stringify({ domain: draft.fields.domain || null, username: draft.fields.username || "", password: draft.fields.password || "", notes: draft.fields.notes || "" }), masterPassword);
    return { user_id: userId, title: draft.title, category: draft.fields.category || "Uncategorized", domain: draft.fields.domain || null, encrypted_data: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt };
  }
  if (draft.type === "note") {
    const encrypted = await encryptText(draft.fields.content || "", masterPassword);
    return { user_id: userId, title: draft.title, category: draft.fields.category || "Uncategorized", encrypted_content: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt };
  }
  if (isCredentialType(draft.type)) {
    const config = CREDENTIAL_TYPE_CONFIGS.find((candidate) => candidate.type === draft.type)!;
    const payload = Object.fromEntries(config.fields.map((field) => [field.key, draft.fields[field.key] || ""]));
    const encrypted = await encryptText(JSON.stringify(payload), masterPassword);
    return { user_id: userId, title: draft.title, type: draft.type, encrypted_content: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt };
  }
  const payload = draft.type === "bank_account"
    ? { account: draft.fields.account || "", routing: draft.fields.routing || "", name: draft.fields.name || "", extra_details: draft.fields.extra_details || "" }
    : { number: draft.fields.number || "", expiry: draft.fields.expiry || "", cvv: draft.fields.cvv || "", name: draft.fields.name || "", pin: draft.fields.pin || "", upi_pin: draft.fields.upi_pin || "", subtype: draft.title.toLowerCase().includes("debit") ? "debit" : "credit", extra_details: draft.fields.extra_details || "" };
  const encrypted = await encryptText(JSON.stringify(payload), masterPassword);
  return { user_id: userId, title: draft.title, type: draft.type === "bank_account" ? "bank_account" : "credit_card", encrypted_content: encrypted.ciphertext, iv: encrypted.iv, salt: encrypted.salt };
}

export async function saveImportDrafts(options: {
  drafts: ImportDraft[];
  masterPassword: string;
  userId: string;
  sourceKind: ImportSource["kind"];
  isOnline: () => boolean;
  onProgress?: (completed: number, total: number, title: string) => void;
}): Promise<ImportSaveResult> {
  if (!options.isOnline()) throw new Error("Connect to the internet before saving this import.");
  const candidates = options.drafts.filter((draft) => draft.included && draft.duplicateResolution !== "skip");
  const skipped = options.drafts.length - candidates.length;
  const operations: ImportHistoryOperation[] = [];
  const failures: ImportSaveFailure[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const draft = candidates[index];
    try {
      if (!options.isOnline()) throw new Error("Connection lost while saving.");
      const table = targetFor(draft);
      const mutation = await encryptedMutation(draft, options.masterPassword, options.userId);
      if (draft.duplicate && draft.duplicateResolution === "replace") {
        const { data: before, error: readError } = await supabase.from(table).select("*").eq("id", draft.duplicate.matchId).eq("user_id", options.userId).single();
        if (readError || !before) throw readError ?? new Error("The matching item no longer exists.");
        const snapshot = await encryptText(JSON.stringify(before), options.masterPassword);
        const { error } = await supabase.from(table).update(mutation as never).eq("id", draft.duplicate.matchId).eq("user_id", options.userId);
        if (error) throw error;
        operations.push({ table, id: draft.duplicate.matchId, kind: "replace", encryptedBefore: snapshot });
      } else {
        const { data, error } = await supabase.from(table).insert(mutation as never).select("id").single();
        if (error || !data) throw error ?? new Error("The saved item did not return an ID.");
        operations.push({ table, id: data.id as string, kind: "insert" });
      }
    } catch (reason) {
      failures.push({ clientId: draft.clientId, title: draft.title, message: reason instanceof Error ? reason.message : "Save failed." });
    }
    options.onProgress?.(index + 1, candidates.length, draft.title);
  }

  const history = createImportHistoryEntry({ sourceKind: options.sourceKind, summary: { total: options.drafts.length, saved: operations.length, failed: failures.length, skipped }, operations });
  saveImportHistory(history);
  [
    "vault_items", "vault_items_titles", "secure_notes", "secure_wallet_cards", "secure_wallet_banks",
    ...CREDENTIAL_TYPE_CONFIGS.map((config) => `secure_credentials:${config.type}`),
  ].forEach(invalidateCache);
  return { history, failures };
}
