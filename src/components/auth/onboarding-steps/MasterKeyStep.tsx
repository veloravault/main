import type { StrengthResult } from "@/lib/passwordHealth";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { OnboardingStepIcon } from "@/components/auth/onboarding-steps/OnboardingStepIcon";
import shell from "@/components/auth/auth-shell.module.css";

export function MasterKeyStep({
  masterKey,
  confirmation,
  hint,
  onMasterKeyChange,
  onConfirmationChange,
  onHintChange,
  strength,
  submitting,
}: {
  masterKey: string;
  confirmation: string;
  hint: string;
  onMasterKeyChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onHintChange: (value: string) => void;
  strength: StrengthResult;
  submitting: boolean;
}) {
  return (
    <>
      <OnboardingStepIcon kind="master-key" />
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
          {masterKey && <PasswordStrengthMeter strength={strength} />}
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
        <label className={shell.field} htmlFor="onboarding-master-key-hint">
          <span className={shell.fieldLabel}>Master key hint (optional)</span>
          <input
            id="onboarding-master-key-hint"
            type="text"
            autoComplete="off"
            value={hint}
            onChange={(event) => onHintChange(event.target.value)}
            maxLength={50}
            disabled={submitting}
          />
          <small className={shell.fieldHint}>
            Something only you will recognize. Never include your master key itself. {hint.length}/50
          </small>
        </label>
      </div>
    </>
  );
}
