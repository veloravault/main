"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import type { ImportDraft } from "@/lib/import/types";
import { withValidation } from "@/lib/import/validation";

const secureFields = new Set(["password", "cvv", "pin", "upi_pin"]);

export function ImportEditor({ draft, onChange }: { draft: ImportDraft; onChange: (draft: ImportDraft) => void }) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const updateTitle = (title: string) => onChange(withValidation({ ...draft, title }));
  const updateField = (field: string, value: string) => onChange(withValidation({ ...draft, fields: { ...draft.fields, [field]: value }, confidence: { ...draft.confidence, [field]: "high" } }));
  return (
    <div className="import-editor">
      <label><span>Title</span><input value={draft.title} onChange={(event) => updateTitle(event.target.value)} /></label>
      {Object.entries(draft.fields).map(([field, value]) => {
        const secure = secureFields.has(field);
        const visible = !secure || revealed.has(field);
        const confidence = draft.confidence[field];
        return <label key={field}><span>{field.replaceAll("_", " ")}{confidence !== "high" && <i className={`is-${confidence}`}>{confidence} confidence</i>}</span><div><input type={visible ? "text" : "password"} value={value} onChange={(event) => updateField(field, event.target.value)} />{secure && <button type="button" aria-label={`${visible ? "Hide" : "Show"} ${field}`} onClick={() => setRevealed((current) => { const next = new Set(current); if (next.has(field)) next.delete(field); else next.add(field); return next; })}>{visible ? <EyeOffIcon /> : <EyeIcon />}</button>}</div></label>;
      })}
      {draft.issues.length > 0 && <div className="import-editor-issues" role="alert">{draft.issues.map((issue) => <p key={issue}>{issue}</p>)}</div>}
    </div>
  );
}
