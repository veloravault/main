"use client";

import { decryptText } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import type { ImportSource } from "@/lib/import/types";

export type ImportTargetTable = "vault_items" | "secure_notes" | "secure_wallet" | "secure_credentials";

export interface ImportHistoryOperation {
  table: ImportTargetTable;
  id: string;
  kind: "insert" | "replace";
  encryptedBefore?: { ciphertext: string; iv: string; salt: string };
}

export interface ImportHistoryEntry {
  id: string;
  createdAt: string;
  undoUntil: string;
  sourceKind: ImportSource["kind"];
  summary: { total: number; saved: number; failed: number; skipped: number };
  operations?: ImportHistoryOperation[];
  undoneAt?: string;
}

const STORAGE_KEY = "velora_import_history_v1";
const MAX_ENTRIES = 10;
const UNDO_MS = 10 * 60 * 1000;

function sanitize(entries: ImportHistoryEntry[]) {
  const now = Date.now();
  return entries.slice(0, MAX_ENTRIES).map((entry) => now > Date.parse(entry.undoUntil) ? { ...entry, operations: undefined } : entry);
}

export function loadImportHistory(): ImportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    const safe = sanitize(parsed.filter((entry): entry is ImportHistoryEntry => Boolean(entry && typeof entry === "object" && "id" in entry && "summary" in entry)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    return safe;
  } catch {
    return [];
  }
}

export function createImportHistoryEntry(input: Omit<ImportHistoryEntry, "id" | "createdAt" | "undoUntil">): ImportHistoryEntry {
  const createdAt = new Date();
  return { ...input, id: crypto.randomUUID(), createdAt: createdAt.toISOString(), undoUntil: new Date(createdAt.getTime() + UNDO_MS).toISOString() };
}

export function saveImportHistory(entry: ImportHistoryEntry) {
  if (JSON.stringify(entry).includes('"fields"')) throw new Error("Import history cannot contain parsed draft fields.");
  const next = sanitize([entry, ...loadImportHistory().filter((item) => item.id !== entry.id)]);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function undoImport(entry: ImportHistoryEntry, masterPassword: string): Promise<ImportHistoryEntry> {
  if (entry.undoneAt) throw new Error("This import has already been undone.");
  if (Date.now() > Date.parse(entry.undoUntil) || !entry.operations?.length) throw new Error("The Undo window for this import has expired.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in again before undoing this import.");

  for (const operation of [...entry.operations].reverse()) {
    if (operation.kind === "insert") {
      const { error } = await supabase.from(operation.table).delete().eq("id", operation.id).eq("user_id", auth.user.id);
      if (error) throw error;
      continue;
    }
    if (!operation.encryptedBefore) throw new Error("The encrypted Undo snapshot is missing.");
    const snapshot = JSON.parse(await decryptText(operation.encryptedBefore.ciphertext, operation.encryptedBefore.salt, operation.encryptedBefore.iv, masterPassword)) as Record<string, unknown>;
    delete snapshot.id;
    delete snapshot.user_id;
    const { error } = await supabase.from(operation.table).update(snapshot).eq("id", operation.id).eq("user_id", auth.user.id);
    for (const key of Object.keys(snapshot)) delete snapshot[key];
    if (error) throw error;
  }

  const updated = { ...entry, operations: undefined, undoneAt: new Date().toISOString() };
  saveImportHistory(updated);
  return updated;
}
