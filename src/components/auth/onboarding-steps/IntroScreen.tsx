"use client";

import { VaultIcon, ShieldCheckIcon, CheckIcon } from "lucide-react";
import shell from "@/components/auth/auth-shell.module.css";
import styles from "@/components/auth/onboarding.module.css";

const ICONS = { vault: VaultIcon, shield: ShieldCheckIcon } as const;

export function IntroScreen({ icon, bullets }: { icon: "vault" | "shield"; bullets: string[] }) {
  const Icon = ICONS[icon];
  return (
    <div className={shell.formStack}>
      <span className={styles.introBadge} aria-hidden="true">
        <Icon width={26} height={26} />
      </span>
      <ul className={styles.introList}>
        {bullets.map((line) => (
          <li key={line} className={styles.introItem}>
            <CheckIcon width={16} height={16} aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
