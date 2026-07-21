"use client";

import { useMemo, useState } from "react";
import {
  EyeIcon,
  EyeOffIcon,
  GaugeIcon,
  SearchCheckIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";
import zxcvbn from "zxcvbn";
import { UtilityPageLayout } from "../UtilityPageLayout";
import { UtilityWorkbench } from "../UtilityWorkbench";
import styles from "../utilities.module.css";

const SCORE_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;

export function PasswordStrengthClient() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const result = useMemo(() => password ? zxcvbn(password) : null, [password]);
  const scoreLabel = result ? SCORE_LABELS[result.score] : "Waiting for a password";

  const workbench = (
    <UtilityWorkbench
      title="Check a password locally"
      description="Measure resistance to common guessing strategies without sending, saving, or logging what you enter."
    >
      <div className={styles.workbenchBody}>
        <div className={styles.outputPanel} style={{ minHeight: 360 }}>
          <div className={styles.passwordField}>
            <label
              className={styles.outputLabel}
              htmlFor="password-strength-input"
            >
              Password to test
            </label>
            <input
              id="password-strength-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              placeholder="Enter a password"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="password-strength-privacy"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOffIcon aria-hidden="true" />
              ) : (
                <EyeIcon aria-hidden="true" />
              )}
            </button>
          </div>

          <div className={styles.feedbackPanel}>
            <p>
              Strength: <strong>{scoreLabel}</strong>
            </p>
            <div
              className={styles.strengthMeter}
              data-score={result?.score ?? 0}
              role="img"
              aria-label={`Password strength: ${scoreLabel}`}
            >
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} aria-hidden="true" />
              ))}
            </div>
            <p id="password-strength-privacy">
              Analysis stays in this browser and is discarded when you leave.
            </p>
          </div>
          <p className={styles.srStatus} aria-live="polite">
            {scoreLabel}
          </p>
        </div>

        <div className={styles.analysisPanel} style={{ minHeight: 360 }}>
          {result ? (
            <>
              <span className={styles.outputLabel}>Local analysis</span>
              <dl className={styles.exampleStack}>
                <div>
                  <dt>Estimated crack time</dt>
                  <dd>
                    {String(
                      result.crack_times_display
                        .offline_slow_hashing_1e4_per_second,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Estimated guesses</dt>
                  <dd>{result.guesses.toLocaleString()}</dd>
                </div>
              </dl>
              <div className={styles.feedbackPanel}>
                {result.feedback.warning ? (
                  <p>
                    <ShieldAlertIcon aria-hidden="true" /> {result.feedback.warning}
                  </p>
                ) : (
                  <p>No common password pattern warning was detected.</p>
                )}
                {result.feedback.suggestions.length > 0 ? (
                  <ul className={styles.bestPracticeList}>
                    {result.feedback.suggestions.map((suggestion, index) => (
                      <li key={`${index}-${suggestion}`}>{suggestion}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Use this password only once and store it in a secure vault.</p>
                )}
              </div>
            </>
          ) : (
            <div className={styles.feedbackPanel}>
              <ShieldCheckIcon aria-hidden="true" />
              <p>Enter a password to see its crack-time estimate and feedback.</p>
              <p>The panel will update without transmitting the password.</p>
            </div>
          )}
        </div>
      </div>
    </UtilityWorkbench>
  );

  return (
    <UtilityPageLayout
      slug="password-strength"
      title="Password Strength Tester"
      description="Test a password against common words, patterns, and cracking strategies entirely on your device."
      workbench={workbench}
      benefits={[
        {
          eyebrow: "Realistic",
          title: "Pattern-aware scoring",
          description:
            "The analysis recognizes common substitutions, repeated text, names, dates, and keyboard paths.",
          icon: <SearchCheckIcon aria-hidden="true" />,
        },
        {
          eyebrow: "Actionable",
          title: "More than a color",
          description:
            "Crack-time estimates and focused suggestions explain what is weakening the password.",
          icon: <GaugeIcon aria-hidden="true" />,
        },
        {
          eyebrow: "Private",
          title: "No network round trip",
          description:
            "Scoring happens locally as you type, with no storage, logging, or analytics payload.",
          icon: <ZapIcon aria-hidden="true" />,
        },
      ]}
      education={[
        {
          eyebrow: "01 · How scoring works",
          title: "Attackers guess patterns before brute force.",
          body: (
            <p>
              Password crackers start with leaked passwords, dictionary words,
              dates, names, and predictable substitutions. This tester estimates
              how many guesses those strategies need instead of counting character
              types alone.
            </p>
          ),
          aside: (
            <ul className={styles.exampleStack}>
              <li>Length helps most when the added characters are unpredictable.</li>
              <li>Replacing an “a” with “@” rarely defeats modern guessing tools.</li>
              <li>A strong score does not make password reuse safe.</li>
            </ul>
          ),
        },
        {
          eyebrow: "02 · Improve the result",
          title: "Generate uniqueness instead of inventing complexity.",
          body: (
            <p>
              The safest response to a weak score is usually a new generated
              password or a longer random passphrase. Editing a familiar password
              often leaves its underlying pattern intact.
            </p>
          ),
          aside: (
            <ul className={styles.bestPracticeList}>
              <li>Use a different password for every account.</li>
              <li>Prefer generated values over personal phrases.</li>
              <li>Store strong passwords in an encrypted vault.</li>
              <li>Enable multi-factor authentication when available.</li>
            </ul>
          ),
        },
      ]}
      ctaTitle="Turn a strong password into a lasting habit."
      ctaDescription="Create a Velora Vault account to keep unique credentials organized in an encrypted vault. Passwords typed into this tester are never saved automatically."
    />
  );
}
