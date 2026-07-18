import { OnboardingStepIcon } from "@/components/auth/onboarding-steps/OnboardingStepIcon";
import shell from "@/components/auth/auth-shell.module.css";

export function CompletionStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className={shell.completion}>
      <OnboardingStepIcon kind="done" />
      <h2>Your vault is ready.</h2>
      <p>Your encrypted workspace is set up and ready for you.</p>
      <button type="button" className={shell.primaryAction} onClick={onContinue}>
        <span>Open my vault</span>
      </button>
    </div>
  );
}
