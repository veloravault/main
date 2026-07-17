"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { Button } from "@/components/ui/button";
import { ImportSourceStep } from "@/components/import/ImportSourceStep";
import { ImportReviewStep } from "@/components/import/ImportReviewStep";
import { ImportProgressStep } from "@/components/import/ImportProgressStep";
import { ImportResultsStep } from "@/components/import/ImportResultsStep";
import { extractGlobalImportDrafts } from "@/app/actions";
import { parseImportCsv } from "@/lib/import/csv";
import { classifyDuplicates, type ExistingImportItem } from "@/lib/import/duplicates";
import { isGlobalImportResult, normalizeImportResult } from "@/lib/import/normalize";
import { loadImportHistory, undoImport, type ImportHistoryEntry } from "@/lib/import/history";
import { saveImportDrafts, type ImportSaveFailure } from "@/lib/import/save";
import type { ImportDraft, ImportSource } from "@/lib/import/types";
import { decryptText } from "@/lib/crypto";
import { getCache } from "@/lib/vaultCache";
import { supabase } from "@/lib/supabase";
import { getVaultAccessToken, vaultFetch } from "@/lib/authToken";

interface GlobalMagicImportProps { isOpen: boolean; onOpenChange: (open: boolean) => void; masterPassword: string | null; onSuccess: () => void; }
type State =
  | { phase: "source" }
  | { phase: "analyzing"; source: ImportSource }
  | { phase: "review"; source: ImportSource; drafts: ImportDraft[] }
  | { phase: "saving"; source: ImportSource; drafts: ImportDraft[]; completed: number; total: number; title: string }
  | { phase: "results"; source: ImportSource; drafts: ImportDraft[]; history: ImportHistoryEntry; failures: ImportSaveFailure[] };
type Action = { type: "RESET" } | { type: "ANALYZE"; source: ImportSource } | { type: "REVIEW"; source: ImportSource; drafts: ImportDraft[] } | { type: "UPDATE_DRAFTS"; drafts: ImportDraft[] } | { type: "SAVING"; total: number } | { type: "SAVE_FAILED" } | { type: "PROGRESS"; completed: number; total: number; title: string } | { type: "RESULTS"; history: ImportHistoryEntry; failures: ImportSaveFailure[] };

function reducer(state: State, action: Action): State {
  if (action.type === "RESET") return { phase: "source" };
  if (action.type === "ANALYZE") return { phase: "analyzing", source: action.source };
  if (action.type === "REVIEW" && (state.phase === "analyzing" || state.phase === "results")) return { phase: "review", source: action.source, drafts: action.drafts };
  if (action.type === "UPDATE_DRAFTS" && state.phase === "review") return { ...state, drafts: action.drafts };
  if (action.type === "SAVING" && state.phase === "review") return { phase: "saving", source: state.source, drafts: state.drafts, completed: 0, total: action.total, title: "" };
  if (action.type === "SAVE_FAILED" && state.phase === "saving") return { phase: "review", source: state.source, drafts: state.drafts };
  if (action.type === "PROGRESS" && state.phase === "saving") return { ...state, completed: action.completed, total: action.total, title: action.title };
  if (action.type === "RESULTS" && state.phase === "saving") return { phase: "results", source: state.source, drafts: state.drafts, history: action.history, failures: action.failures };
  if (action.type === "RESULTS" && state.phase === "results") return { ...state, history: action.history, failures: action.failures };
  return state;
}

export function GlobalMagicImport({ isOpen, onOpenChange, masterPassword, onSuccess }: GlobalMagicImportProps) {
  const [state, dispatch] = useReducer(reducer, { phase: "source" });
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [undoing, setUndoing] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const generation = useRef(0);

  useEffect(() => { if (isOpen) queueMicrotask(() => setHistory(loadImportHistory())); }, [isOpen]);
  const title = state.phase === "source" ? "Magic Import" : state.phase === "analyzing" ? "Analyzing source" : state.phase === "review" ? "Review import" : state.phase === "saving" ? "Saving securely" : "Import results";
  const description = state.phase === "source" ? "Choose a source. Nothing is saved until you review it." : state.phase === "review" ? "Edit fields, resolve duplicates and choose exactly what to save." : "Your data is encrypted before it reaches the vault.";

  const requestClose = () => {
    if (state.phase === "saving") { setCloseConfirm(true); return; }
    generation.current += 1;
    onOpenChange(false);
    window.setTimeout(() => { dispatch({ type: "RESET" }); setInputText(""); setError(null); }, 220);
  };

  const analyze = async (source: ImportSource) => {
    if (!masterPassword) return;
    const currentGeneration = ++generation.current;
    setError(null);
    dispatch({ type: "ANALYZE", source });
    try {
      let drafts: ImportDraft[] = [];
      if (source.kind === "paste") {
        const response = await extractGlobalImportDrafts(await getVaultAccessToken(), source.text);
        if (!response.ok) throw new Error(response.message);
        drafts = response.drafts;
      } else if (source.kind === "csv" || source.kind === "browser_csv") {
        const parsed = await parseImportCsv(source.file);
        if (!parsed.drafts.length) throw new Error(parsed.errors[0] ?? "The CSV did not contain supported vault items.");
        drafts = parsed.drafts;
        if (parsed.errors.length) setError(parsed.errors[0]);
      } else {
        const imageBase64 = await readFileAsDataUrl(source.file);
        const response = await vaultFetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64, type: "global_import" }) });
        const payload = await response.json() as { ok?: boolean; data?: unknown; error?: string };
        if (!response.ok || !payload.ok || !isGlobalImportResult(payload.data)) throw new Error(payload.error ?? "The image could not be analyzed.");
        drafts = normalizeImportResult(payload.data, source.file.name);
      }
      if (generation.current !== currentGeneration) return;
      drafts = classifyDuplicates(drafts, await loadExistingItems(masterPassword));
      dispatch({ type: "REVIEW", source, drafts });
    } catch (reason) {
      if (generation.current !== currentGeneration) return;
      setError(reason instanceof Error ? reason.message : "This source could not be analyzed.");
      dispatch({ type: "RESET" });
    }
  };

  const save = async () => {
    if (state.phase !== "review" || !masterPassword) return;
    const drafts = state.drafts;
    const source = state.source;
    const candidates = drafts.filter((draft) => draft.included && draft.duplicateResolution !== "skip");
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) { setError(authError?.message ?? "Sign in again before importing."); return; }
    dispatch({ type: "SAVING", total: candidates.length });
    try {
      const result = await saveImportDrafts({ drafts, masterPassword, userId: data.user.id, sourceKind: source.kind, isOnline: () => navigator.onLine, onProgress: (completed, total, itemTitle) => dispatch({ type: "PROGRESS", completed, total, title: itemTitle }) });
      dispatch({ type: "RESULTS", history: result.history, failures: result.failures });
      setHistory(loadImportHistory());
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The import could not be saved.");
      dispatch({ type: "SAVE_FAILED" });
    }
  };

  const undo = async (entry: ImportHistoryEntry) => {
    if (!masterPassword) return;
    setUndoing(true); setError(null);
    try { await undoImport(entry, masterPassword); setHistory(loadImportHistory()); if (state.phase === "results" && state.history.id === entry.id) dispatch({ type: "RESULTS", history: { ...entry, operations: undefined, undoneAt: new Date().toISOString() }, failures: state.failures }); onSuccess(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Undo failed."); }
    finally { setUndoing(false); }
  };

  return (
    <>
      <AdaptiveSheet open={isOpen} onOpenChange={(open) => { if (!open) requestClose(); }} title={title} description={description} size="lg" className="magic-import-workflow">
        <AdaptiveSheetBody className="magic-import-workflow-body">
          {error && <div className="import-global-error" role="alert">{error}</div>}
          {state.phase === "source" && <ImportSourceStep text={inputText} onTextChange={setInputText} onAnalyze={analyze} history={history} onUndoHistory={undo} />}
          {state.phase === "analyzing" && <div className="import-analyzing"><Loader2Icon className="animate-spin" aria-hidden="true" /><h3>Reading your data</h3><p>Detecting fields and preparing an editable review.</p></div>}
          {state.phase === "review" && <ImportReviewStep drafts={state.drafts} onChange={(drafts) => dispatch({ type: "UPDATE_DRAFTS", drafts })} onBack={() => dispatch({ type: "RESET" })} onSave={save} />}
          {state.phase === "saving" && <ImportProgressStep completed={state.completed} total={state.total} title={state.title} />}
          {state.phase === "results" && <ImportResultsStep history={state.history} failures={state.failures} undoing={undoing} onUndo={() => undo(state.history)} onRetry={() => dispatch({ type: "REVIEW", source: state.source, drafts: state.drafts.filter((draft) => state.failures.some((failure) => failure.clientId === draft.clientId)) })} onDone={requestClose} />}
        </AdaptiveSheetBody>
      </AdaptiveSheet>
      <AdaptiveSheet open={closeConfirm} onOpenChange={setCloseConfirm} title="Close while saving?" description="Items already completed will remain in your vault." size="sm"><AdaptiveSheetBody><p className="import-close-warning">The secure save continues in the background. You can reopen Magic Import to see the final result.</p></AdaptiveSheetBody><AdaptiveSheetFooter><Button variant="ghost" onClick={() => setCloseConfirm(false)}>Keep open</Button><Button variant="destructive" onClick={() => { setCloseConfirm(false); onOpenChange(false); }}>Close importer</Button></AdaptiveSheetFooter></AdaptiveSheet>
    </>
  );
}

async function readFileAsDataUrl(file: File) { return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }

async function loadExistingItems(masterPassword: string): Promise<ExistingImportItem[]> {
  const cached = [
    ...(getCache<{ id: string; title: string; plaintext?: string }>("vault_items") ?? []).map((item) => ({ id: item.id, title: item.title, type: "password" as const, fields: parsePayload(item.plaintext) })),
    ...(getCache<{ id: string; title: string; plaintext?: string }>("secure_notes") ?? []).map((item) => ({ id: item.id, title: item.title, type: "note" as const, fields: { content: item.plaintext ?? "" } })),
  ];
  const [passwords, notes, wallet] = await Promise.all([supabase.from("vault_items").select("id,title,encrypted_data,iv,salt"), supabase.from("secure_notes").select("id,title,encrypted_content,iv,salt"), supabase.from("secure_wallet").select("id,title,type,encrypted_content,iv,salt")]);
  const existing: ExistingImportItem[] = [...cached];
  for (const item of passwords.data ?? []) try { existing.push({ id: item.id, title: item.title, type: "password", fields: parsePayload(await decryptText(item.encrypted_data, item.salt, item.iv, masterPassword)) }); } catch {}
  for (const item of notes.data ?? []) try { existing.push({ id: item.id, title: item.title, type: "note", fields: { content: await decryptText(item.encrypted_content, item.salt, item.iv, masterPassword) } }); } catch {}
  for (const item of wallet.data ?? []) try { existing.push({ id: item.id, title: item.title, type: item.type === "bank_account" ? "bank_account" : "card", fields: parsePayload(await decryptText(item.encrypted_content, item.salt, item.iv, masterPassword)) }); } catch {}
  return [...new Map(existing.map((item) => [`${item.type}:${item.id}`, item])).values()];
}

function parsePayload(value?: string): Record<string, string> { if (!value) return {}; try { const parsed = JSON.parse(value) as Record<string, unknown>; return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, typeof item === "string" ? item : ""])); } catch { return { content: value }; } }
