import type { CSSProperties } from "react";
import type { StrengthLevel, StrengthResult } from "@/lib/passwordHealth";
import styles from "./auth-shell.module.css";

const LEVEL_SEGMENTS: Record<StrengthLevel, number> = {
  weak: 1,
  fair: 2,
  strong: 3,
  "very-strong": 4,
};

const STRENGTH_COLOR_VAR: Record<StrengthLevel, string> = {
  weak: "var(--auth-red)",
  fair: "var(--auth-amber)",
  strong: "var(--auth-blue)",
  "very-strong": "var(--auth-green)",
};

export function PasswordStrengthMeter({ strength }: { strength: StrengthResult }) {
  const activeSegments = LEVEL_SEGMENTS[strength.level];
  const color = STRENGTH_COLOR_VAR[strength.level];

  return (
    <div className={styles.strengthMeter}>
      <span
        className={styles.strengthTrack}
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={strength.score}
        aria-valuetext={strength.label}
        style={{ "--strength-color": color } as CSSProperties}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className={styles.strengthSegment}
            data-active={index < activeSegments}
            aria-hidden="true"
          />
        ))}
      </span>
      <span className={styles.strengthLabel} style={{ color }} aria-hidden="true">
        {strength.label}
      </span>
    </div>
  );
}
