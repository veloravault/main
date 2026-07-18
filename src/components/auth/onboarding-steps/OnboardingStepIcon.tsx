import {
  CircleCheckBigIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";
import styles from "@/components/auth/onboarding.module.css";

export type OnboardingIconKind = "vault" | "security" | "avatar" | "master-key" | "done";

const STEP_ICONS = {
  vault: KeyRoundIcon,
  security: ShieldCheckIcon,
  avatar: UserRoundIcon,
  "master-key": LockKeyholeIcon,
  done: CircleCheckBigIcon,
} as const;

export function OnboardingStepIcon({ kind }: { kind: OnboardingIconKind }) {
  const Icon = STEP_ICONS[kind];
  return (
    <span className={styles.stepIcon} data-kind={kind} aria-hidden="true">
      <Icon width={27} height={27} strokeWidth={1.8} />
    </span>
  );
}
