"use client";

import { Trash2Icon, XIcon } from "lucide-react";

export function SelectionToolbar({ count, onCancel, onDelete }: { count: number; onCancel: () => void; onDelete: () => void }) {
  const deleteSelected = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    onDelete();
  };
  return <div className="apple-selection-toolbar apple-material md:hidden" role="toolbar" aria-label="Selection actions">
    <button className="apple-pressed" onClick={onCancel} aria-label="Cancel selection"><XIcon className="h-5 w-5" /></button>
    <span className="type-metadata font-semibold tabular-nums">{count} selected</span>
    <button className="apple-pressed text-destructive" onClick={deleteSelected} disabled={count === 0} aria-label="Delete selected"><Trash2Icon className="h-5 w-5" /></button>
  </div>;
}
