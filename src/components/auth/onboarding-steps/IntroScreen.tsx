import {
  EyeOffIcon,
  FileLock2Icon,
  KeyIcon,
  KeyRoundIcon,
  MonitorSmartphoneIcon,
  ShieldCheckIcon,
} from "lucide-react";
import type { OnboardingBenefit, OnboardingBenefitIcon } from "@/components/auth/onboarding-steps/onboardingSteps";
import { OnboardingStepIcon, type OnboardingIconKind } from "@/components/auth/onboarding-steps/OnboardingStepIcon";
import shell from "@/components/auth/auth-shell.module.css";
import styles from "@/components/auth/onboarding.module.css";

const BENEFIT_ICONS: Record<OnboardingBenefitIcon, typeof KeyIcon> = {
  key: KeyIcon,
  "file-lock": FileLock2Icon,
  "shield-check": ShieldCheckIcon,
  "monitor-smartphone": MonitorSmartphoneIcon,
  "eye-off": EyeOffIcon,
  "key-round": KeyRoundIcon,
};

export function IntroScreen({ icon, bullets }: { icon: OnboardingIconKind; bullets: OnboardingBenefit[] }) {
  return (
    <div className={shell.formStack}>
      <OnboardingStepIcon kind={icon} />
      <ul className={styles.introList}>
        {bullets.map((bullet) => {
          const BenefitIcon = BENEFIT_ICONS[bullet.icon];
          return (
            <li key={bullet.text} className={styles.introItem}>
              <span className={styles.benefitIcon} aria-hidden="true"><BenefitIcon width={16} height={16} /></span>
              <span>{bullet.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
