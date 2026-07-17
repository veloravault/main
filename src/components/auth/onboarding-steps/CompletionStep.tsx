"use client";

import { CheckIcon } from "lucide-react";
import shell from "@/components/auth/auth-shell.module.css";

export function CompletionStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className={shell.completion}>
      <span className={shell.completionMark}><CheckIcon width={26} height={26} aria-hidden="true" /></span>
      <h2>Your vault is ready.</h2>
      <p>Your encrypted workspace is set up and ready for you.</p>
      <button type="button" className={shell.primaryAction} onClick={onContinue}>
        <span>Open my vault</span>
      </button>
    </div>
  );
}
