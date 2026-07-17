"use client";

import type { StrengthLevel } from "@/lib/passwordHealth";
import shell from "@/components/auth/auth-shell.module.css";

const STRENGTH_COLOR_VAR: Record<StrengthLevel, string> = {
  weak: "var(--auth-red)",
  fair: "var(--auth-amber)",
  strong: "var(--auth-blue)",
  "very-strong": "var(--auth-green)",
};

export function MasterKeyStep({
  masterKey,
  confirmation,
  onMasterKeyChange,
  onConfirmationChange,
  strength,
  submitting,
}: {
  masterKey: string;
  confirmation: string;
  onMasterKeyChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  strength: { level: StrengthLevel; score: number; label: string };
  submitting: boolean;
}) {
  return (
    <div className={shell.fieldGroup}>
      <label className={shell.field} htmlFor="onboarding-master-key">
        <span className={shell.fieldLabel}>Vault master key</span>
        <input
          id="onboarding-master-key"
          type="password"
          autoComplete="off"
          value={masterKey}
          onChange={(event) => onMasterKeyChange(event.target.value)}
          disabled={submitting}
          required
        />
        <small className={shell.fieldHint}>Never sent, stored, logged, or added to your account.</small>
        {masterKey && (
          <div className={shell.strengthMeter} aria-live="polite">
            <span className={shell.strengthTrack}>
              <span
                className={shell.strengthFill}
                style={{ width: `${strength.score}%`, backgroundColor: STRENGTH_COLOR_VAR[strength.level] }}
              />
            </span>
            <span className={shell.strengthLabel} style={{ color: STRENGTH_COLOR_VAR[strength.level] }}>
              {strength.label}
            </span>
          </div>
        )}
      </label>
      <label className={shell.field} htmlFor="onboarding-master-key-confirmation">
        <span className={shell.fieldLabel}>Confirm master key</span>
        <input
          id="onboarding-master-key-confirmation"
          type="password"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          disabled={submitting}
          required
        />
      </label>
    </div>
  );
}
