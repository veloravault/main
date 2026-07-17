"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, FileSpreadsheetIcon, HistoryIcon, KeyRoundIcon, TextCursorInputIcon, UploadIcon } from "lucide-react";
import type { ImportHistoryEntry } from "@/lib/import/history";
import type { ImportSource } from "@/lib/import/types";

export function ImportSourceStep(props: {
  text: string;
  onTextChange: (value: string) => void;
  onAnalyze: (source: ImportSource) => void;
  history: ImportHistoryEntry[];
  onUndoHistory: (entry: ImportHistoryEntry) => void;
}) {
  const [now, setNow] = useState(0);
  const genericCsv = useRef<HTMLInputElement>(null);
  const browserCsv = useRef<HTMLInputElement>(null);
  const image = useRef<HTMLInputElement>(null);
  const choose = (ref: React.RefObject<HTMLInputElement | null>) => ref.current?.click();
  const selectFile = (kind: "csv" | "browser_csv" | "image", event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so re-selecting the same file (e.g. retrying after an error)
    // still fires a change event next time.
    event.target.value = "";
    if (file) props.onAnalyze({ kind, file });
  };
  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, [props.history]);

  return (
    <div className="import-source-step">
      <div className="import-source-grid">
        <SourceButton icon={TextCursorInputIcon} title="Paste text" detail="Credentials, notes and account details" onClick={() => document.getElementById("magic-import-paste")?.focus()} />
        <SourceButton icon={FileSpreadsheetIcon} title="Upload CSV" detail="Generic spreadsheet data" onClick={() => choose(genericCsv)} />
        <SourceButton icon={KeyRoundIcon} title="Browser export" detail="Chrome, Safari, Edge and Brave CSV" onClick={() => choose(browserCsv)} />
        <SourceButton icon={CameraIcon} title="Scan image" detail="Screenshot, statement or credential image" onClick={() => choose(image)} />
      </div>
      <input ref={genericCsv} hidden type="file" accept=".csv,text/csv" onChange={(event) => selectFile("csv", event)} />
      <input ref={browserCsv} hidden type="file" accept=".csv,text/csv" onChange={(event) => selectFile("browser_csv", event)} />
      <input ref={image} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => selectFile("image", event)} />

      <div className="import-paste-panel">
        <label htmlFor="magic-import-paste">Paste anything</label>
        <textarea id="magic-import-paste" value={props.text} onChange={(event) => props.onTextChange(event.target.value)} placeholder="Paste passwords, notes, bank details or card details…" />
        <button type="button" className="import-primary-action system-interactive" disabled={!props.text.trim()} onClick={() => props.onAnalyze({ kind: "paste", text: props.text })}><UploadIcon aria-hidden="true" />Analyze pasted data</button>
      </div>

      {props.history.length > 0 && <section className="import-history"><div className="import-history-title"><HistoryIcon aria-hidden="true" /><span>Recent imports</span></div>{props.history.map((entry) => { const canUndo = Boolean(entry.operations?.length && !entry.undoneAt && now > 0 && now < Date.parse(entry.undoUntil)); return <div key={entry.id} className="import-history-row"><span><strong>{entry.sourceKind.replace("_", " ")}</strong><small>{new Date(entry.createdAt).toLocaleString()} · {entry.summary.saved} saved</small></span>{canUndo && <button type="button" onClick={() => props.onUndoHistory(entry)}>Undo</button>}{entry.undoneAt && <i>Undone</i>}</div>; })}</section>}
    </div>
  );
}

function SourceButton(props: { icon: typeof CameraIcon; title: string; detail: string; onClick: () => void }) {
  const Icon = props.icon;
  return <button type="button" className="import-source-card system-interactive" onClick={props.onClick}><span><Icon aria-hidden="true" /></span><strong>{props.title}</strong><small>{props.detail}</small></button>;
}
