"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon, CheckCircleIcon, ChevronRightIcon, CopyIcon, Edit3Icon } from "lucide-react";
import { AdaptiveSheet, AdaptiveSheetBody, AdaptiveSheetFooter } from "@/components/ui/adaptive-sheet";
import { Button } from "@/components/ui/button";
import { ImportEditor } from "@/components/import/ImportEditor";
import { CREDENTIAL_TYPE_CONFIGS } from "@/lib/credentialTypes";
import type { DuplicateResolution, ImportDraft, ImportItemType } from "@/lib/import/types";

const labels: Record<ImportItemType, string> = {
  password: "Passwords", note: "Notes", bank_account: "Bank Accounts", card: "Cards",
  ...Object.fromEntries(CREDENTIAL_TYPE_CONFIGS.map((config) => [config.type, config.label])),
} as Record<ImportItemType, string>;

export function ImportReviewStep(props: { drafts: ImportDraft[]; onChange: (drafts: ImportDraft[]) => void; onBack: () => void; onSave: () => void }) {
  const [selectedId, setSelectedId] = useState(props.drafts[0]?.clientId ?? "");
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const selected = props.drafts.find((draft) => draft.clientId === selectedId) ?? props.drafts[0];
  const selectedCount = props.drafts.filter((draft) => draft.included && draft.duplicateResolution !== "skip").length;
  const invalidCount = props.drafts.filter((draft) => draft.included && draft.issues.length > 0).length;
  const unresolvedCount = props.drafts.filter((draft) => draft.included && draft.duplicate && draft.duplicateResolution === "unresolved").length;
  const groups = useMemo(() => Object.entries(props.drafts.reduce<Partial<Record<ImportItemType, ImportDraft[]>>>((result, draft) => {
    (result[draft.type] ??= []).push(draft);
    return result;
  }, {})) as Array<[ImportItemType, ImportDraft[]]>, [props.drafts]);
  const update = (next: ImportDraft) => props.onChange(props.drafts.map((draft) => draft.clientId === next.clientId ? next : draft));
  const updateDuplicate = (draft: ImportDraft, resolution: DuplicateResolution) => update({ ...draft, duplicateResolution: resolution, included: resolution !== "skip" });

  return (
    <div className="import-review-step">
      <div className="import-review-summary"><span><strong>{selectedCount}</strong><small>Selected</small></span><span><strong>{props.drafts.filter((draft) => draft.duplicate).length}</strong><small>Duplicates</small></span><span><strong>{invalidCount}</strong><small>Incomplete</small></span></div>
      <div className="import-review-workspace">
        <div className="import-draft-list">
          {groups.map(([type, drafts]) => <section key={type}><header><span>{labels[type]}</span><button type="button" onClick={() => { const allIncluded = drafts.every((draft) => draft.included); props.onChange(props.drafts.map((draft) => draft.type === type ? { ...draft, included: !allIncluded } : draft)); }}>{drafts.every((draft) => draft.included) ? "Exclude all" : "Include all"}</button></header>{drafts.map((draft) => <div key={draft.clientId} className={`import-draft-row system-interactive ${selected?.clientId === draft.clientId ? "is-selected" : ""}`}><input type="checkbox" checked={draft.included} onChange={(event) => update({ ...draft, included: event.target.checked })} aria-label={`Include ${draft.title}`} /><button type="button" className="import-draft-select" onClick={() => { setSelectedId(draft.clientId); setMobileEditorOpen(true); }}><span><strong>{draft.title || "Untitled"}</strong><small>{draft.issues.length ? `${draft.issues.length} issue${draft.issues.length === 1 ? "" : "s"}` : draft.sourceLabel}</small></span>{draft.duplicate ? <CopyIcon className="is-duplicate" aria-label="Possible duplicate" /> : draft.issues.length ? <AlertTriangleIcon className="is-warning" /> : <CheckCircleIcon className="is-ready" />}<ChevronRightIcon className="import-draft-chevron" /></button></div>)}</section>)}
        </div>
        {selected && <div className="import-editor-pane"><div className="import-editor-title"><Edit3Icon aria-hidden="true" /><span>Edit detected item</span></div>{selected.duplicate && <DuplicateChoice draft={selected} onChange={updateDuplicate} />}<ImportEditor draft={selected} onChange={update} /></div>}
      </div>
      <div className="import-review-footer"><Button variant="ghost" onClick={() => { if (confirm("Going back will discard your edits and duplicate choices for this import. Continue?")) props.onBack(); }}>Back</Button><div><span>{invalidCount > 0 ? `Fix ${invalidCount} incomplete item${invalidCount === 1 ? "" : "s"}` : unresolvedCount > 0 ? `Resolve ${unresolvedCount} duplicate${unresolvedCount === 1 ? "" : "s"}` : `${selectedCount} ready to save`}</span><Button className="import-primary-action" disabled={!selectedCount || invalidCount > 0 || unresolvedCount > 0} onClick={props.onSave}>Save {selectedCount} items</Button></div></div>
      {selected && <AdaptiveSheet open={mobileEditorOpen} onOpenChange={setMobileEditorOpen} title="Edit imported item" description={selected.title || "Untitled"} size="md" className="import-mobile-editor"><AdaptiveSheetBody>{selected.duplicate && <DuplicateChoice draft={selected} onChange={updateDuplicate} />}<ImportEditor draft={selected} onChange={update} /></AdaptiveSheetBody><AdaptiveSheetFooter><Button onClick={() => setMobileEditorOpen(false)}>Done</Button></AdaptiveSheetFooter></AdaptiveSheet>}
    </div>
  );
}

function DuplicateChoice({ draft, onChange }: { draft: ImportDraft; onChange: (draft: ImportDraft, resolution: DuplicateResolution) => void }) {
  return <div className="import-duplicate-choice"><p>Possible duplicate of <strong>{draft.duplicate?.label}</strong></p><div>{(["skip", "keep_both", "replace"] as DuplicateResolution[]).map((value) => <button key={value} type="button" className={draft.duplicateResolution === value ? "is-active" : ""} onClick={() => onChange(draft, value)}>{value === "keep_both" ? "Keep both" : value[0].toUpperCase() + value.slice(1)}</button>)}</div></div>;
}
