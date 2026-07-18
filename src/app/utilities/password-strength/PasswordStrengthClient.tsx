"use client";

import { useMemo, useState } from "react";
import zxcvbn from "zxcvbn";
import styles from "../utilities.module.css";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  GaugeIcon,
  SearchCheckIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";
import {
  LANDING_VIEWPORT,
  HOVER_LIFT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "@/components/dreelio/motion";

function getScoreColor(score: number) {
  switch (score) {
    case 0:
    case 1:
      return "bg-destructive";
    case 2:
      return "bg-orange-500";
    case 3:
      return "bg-yellow-500";
    case 4:
      return "bg-system-green";
    default:
      return "bg-separator";
  }
}

function getScoreLabel(score: number) {
  switch (score) {
    case 0:
    case 1:
      return "Weak";
    case 2:
      return "Fair";
    case 3:
      return "Good";
    case 4:
      return "Strong";
    default:
      return "";
  }
}

export function PasswordStrengthClient() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? undefined : revealVariants(22);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const result = useMemo(() => {
    if (!password) return null;
    return zxcvbn(password);
  }, [password]);

  return (
    <main className={styles.page}>
      <motion.section
        className={styles.hero}
        initial={false}
        animate="show"
        variants={staggerContainer}
      >
        <motion.div className={styles.heroCopy} variants={staggerItem}>
          <p className={styles.eyebrow}>Free Utility</p>
          <h1>Password Strength Tester</h1>
          <p>
            Test the strength of a password entirely on your device. We evaluate
            entropy, common patterns, and dictionary words instantly — nothing you
            type here is ever logged, transmitted, or stored.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.jumpLink} href="#how-it-works">
              How it works <ArrowRightIcon aria-hidden="true" />
            </a>
          </div>
        </motion.div>

        <motion.div className={styles.heroVisual} variants={staggerItem}>
          <div className="bg-[#F2F2F7] dark:bg-[#000000] p-6 rounded-[32px] space-y-4 border border-separator/50 shadow-[0_26px_70px_-54px_rgba(0,0,0,0.44)] relative">
            <div className="bg-card shadow-sm rounded-[22px] border border-separator p-4 sm:p-6">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Type a password..."
                  className="w-full h-14 bg-fill-tertiary rounded-[14px] px-4 pr-12 text-lg font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-separator/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-muted-foreground">Strength</span>
                  <span className={password ? "text-foreground" : "text-muted-foreground"}>
                    {password && result ? getScoreLabel(result.score) : "None"}
                  </span>
                </div>
                <div className="flex gap-2 h-2.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-colors duration-500 ${
                        password && result && result.score >= level
                          ? getScoreColor(result.score)
                          : "bg-fill-tertiary"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {result ? (
              <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator">
                <div className="divide-y divide-separator/50">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg">
                        <ShieldAlertIcon className="w-4 h-4" />
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[14px]">Crack Time</span>
                        <span className="text-xs text-muted-foreground">Estimated time to crack</span>
                      </div>
                    </div>
                    <span className="font-semibold text-[14px] text-right">
                      {result.crack_times_display.offline_slow_hashing_1e4_per_second}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg">
                        <SearchCheckIcon className="w-4 h-4" />
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[14px]">Guesses</span>
                        <span className="text-xs text-muted-foreground">Required attempts</span>
                      </div>
                    </div>
                    <span className="font-mono text-[13px] text-right font-medium">
                      {result.guesses.toLocaleString()}
                    </span>
                  </div>
                </div>

                {(result.feedback.warning || result.feedback.suggestions.length > 0) && (
                  <div className="p-4 bg-fill-tertiary border-t border-separator/50">
                    {result.feedback.warning && (
                      <p className="text-[13px] font-medium text-orange-500 flex items-start gap-2 mb-2">
                        <ShieldAlertIcon className="w-4 h-4 shrink-0 mt-0.5" />
                        {result.feedback.warning}
                      </p>
                    )}
                    {result.feedback.suggestions.length > 0 && (
                      <ul className="text-[12px] text-muted-foreground list-disc list-inside space-y-1 ml-1">
                        {result.feedback.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card shadow-sm rounded-[22px] border border-separator p-6 flex flex-col items-center justify-center text-center opacity-70">
                <ShieldCheckIcon className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-[14px] text-muted-foreground font-medium">
                  Type a password to see detailed analysis
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        className={styles.factGrid}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={staggerContainer}
      >
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Identify</span>
          <strong>Weaknesses instantly</strong>
          <SearchCheckIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Actionable</span>
          <strong>Real-time feedback</strong>
          <GaugeIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Completely</span>
          <strong>Private, client-side</strong>
          <ShieldCheckIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Instant</span>
          <strong>No network round trip</strong>
          <ZapIcon aria-hidden="true" />
        </motion.article>
      </motion.section>

      <div id="how-it-works" className={styles.story}>
        <motion.section
          className={styles.storyRow}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={reveal}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionIndex}>01 · How it works</p>
            <h2>How does a password strength tester work?</h2>
            <p>
              A reliable strength tester evaluates more than length and character
              types. Zxcvbn, the same engine that powers this tool, analyzes
              patterns, dictionaries, common names, and known leaked-password
              structures to estimate real-world crack time.
            </p>
          </div>
          <div className="bg-[var(--surface-alt-soft)] border border-[var(--line)] rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[340px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,122,255,0.1),transparent_70%)]" />
            <GaugeIcon className="w-24 h-24 text-[var(--accent)] mb-6 relative z-10" />
            <p className="text-center font-medium text-[var(--ink)] z-10">Estimated crack time matters far more than a simple pass/fail label.</p>
          </div>
        </motion.section>

        <motion.section
          className={`${styles.storyRow} ${styles.storyRowReverse}`}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={reveal}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionIndex}>02 · What actually helps</p>
            <h2>What makes a password truly strong?</h2>
            <p>
              It&rsquo;s a common misconception that substituting letters for
              numbers, like replacing &ldquo;e&rdquo; with &ldquo;3&rdquo;, makes
              a password secure. Modern cracking tools already account for these
              tricks. Real strength comes from entropy: unpredictability and length.
            </p>
            <ol className={styles.accessSteps}>
              <li><span>1</span> Favor length over clever substitutions</li>
              <li><span>2</span> Avoid names, dates, and dictionary words</li>
              <li><span>3</span> Use a generator instead of inventing your own</li>
              <li><span>4</span> Test it here before you rely on it</li>
            </ol>
          </div>
          <div className="bg-[var(--surface-alt-soft)] border border-[var(--line)] rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[340px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,149,0,0.1),transparent_70%)]" />
            <div className="bg-[var(--card-white)] border border-[var(--line)] shadow-sm rounded-xl p-4 w-full mb-4 opacity-50 relative z-10 line-through font-mono">
              P@ssw0rd1
            </div>
            <div className="bg-[var(--card-white)] border-2 border-[var(--accent)] shadow-sm rounded-xl p-4 w-full relative z-10">
              <span className="text-[var(--accent)] font-mono font-bold tracking-tight break-all">T=z8.txQD~!ppX</span>
            </div>
          </div>
        </motion.section>
      </div>

      <motion.section
        className={styles.finalCard}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={reveal}
      >
        <div>
          <p className={styles.eyebrow}>Peace of mind</p>
          <h2>Stop guessing. Start knowing.</h2>
          <p>Velora Vault generates and scores every password for you, then stores it encrypted on your device before it ever reaches our servers.</p>
        </div>
        <div className={styles.actions}>
          <motion.div whileHover={reduceMotion ? undefined : HOVER_LIFT} whileTap={reduceMotion ? undefined : TAP_PRESS}>
            <a href="/signup" className={styles.primaryAction}>Sign up free</a>
          </motion.div>
        </div>
      </motion.section>
    </main>
  );
}
