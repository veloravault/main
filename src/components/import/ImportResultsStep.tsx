"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, CheckCircleIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportHistoryEntry } from "@/lib/import/history";
import type { ImportSaveFailure } from "@/lib/import/save";

export function ImportResultsStep(props: { history: ImportHistoryEntry; failures: ImportSaveFailure[]; undoing: boolean; onUndo: () => void; onRetry: () => void; onDone: () => void }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, [props.history]);
  const canUndo = Boolean(props.history.operations?.length && !props.history.undoneAt && now > 0 && now < Date.parse(props.history.undoUntil));
  return <div className="import-results-step"><span className={props.failures.length ? "is-warning" : "is-success"}>{props.failures.length ? <AlertTriangleIcon aria-hidden="true" /> : <CheckCircleIcon aria-hidden="true" />}</span><h3>{props.failures.length ? "Import completed with issues" : "Import complete"}</h3><p>{props.history.summary.saved} saved · {props.history.summary.skipped} skipped · {props.failures.length} failed</p><div className="import-results-stats"><div><strong>{props.history.summary.saved}</strong><small>Saved</small></div><div><strong>{props.history.summary.skipped}</strong><small>Skipped</small></div><div><strong>{props.failures.length}</strong><small>Failed</small></div></div>{props.failures.length > 0 && <div className="import-failure-list">{props.failures.map((failure) => <p key={failure.clientId}><strong>{failure.title}</strong><span>{failure.message}</span></p>)}</div>}<div className="import-results-actions">{canUndo && <Button variant="outline" onClick={props.onUndo} disabled={props.undoing}><RotateCcwIcon />{props.undoing ? "Undoing" : "Undo import"}</Button>}{props.failures.length > 0 && <Button variant="outline" onClick={props.onRetry}>Retry failed</Button>}<Button onClick={props.onDone}>Done</Button></div></div>;
}
