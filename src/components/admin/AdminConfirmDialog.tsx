"use client";

import { useEffect, useRef } from "react";
import styles from "@/app/admin/admin.module.css";

export function AdminConfirmDialog(props: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const { busy, onCancel, open } = props;

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
      if (event.key === "Tab") {
        const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
        const first = buttons[0];
        const last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last && first) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);

  if (!props.open) return null;
  return (
    <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !props.busy) props.onCancel();
    }}>
      <section
        ref={dialogRef}
        className={styles.confirmDialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
      >
        <p className={styles.eyebrow}>Confirm access change</p>
        <h2 id="admin-confirm-title">{props.title}</h2>
        <p id="admin-confirm-description">{props.description}</p>
        <div className={styles.dialogActions}>
          <button ref={cancelRef} type="button" disabled={props.busy} onClick={props.onCancel}>Keep access</button>
          <button type="button" disabled={props.busy} data-destructive={props.destructive || undefined} onClick={props.onConfirm}>
            {props.busy ? "Updating…" : props.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
