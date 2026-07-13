"use client";

import { Loader2Icon, ShieldCheckIcon } from "lucide-react";

export function ImportProgressStep({ completed, total, title }: { completed: number; total: number; title: string }) {
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return <div className="import-progress-step"><span className="import-progress-icon"><ShieldCheckIcon aria-hidden="true" /><Loader2Icon className="animate-spin" aria-hidden="true" /></span><h3>Encrypting and saving</h3><p>{title ? `Saving “${title}”` : "Preparing your selected items"}</p><div className="import-progress-track"><span style={{ width: `${percent}%` }} /></div><strong>{completed} of {total}</strong></div>;
}
