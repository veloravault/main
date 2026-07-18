"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { secureRandomInt } from "@/lib/secureRandom";
import styles from "../utilities.module.css";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  ShuffleIcon,
  KeyIcon,
} from "lucide-react";
import {
  LANDING_VIEWPORT,
  HOVER_LIFT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "@/components/dreelio/motion";

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  special: "!@#$%^&*()_+~`|}{[]:;?><,./-=",
};

type CharsetOptions = Record<keyof typeof CHAR_SETS, boolean>;

function buildPassword(length: number, options: CharsetOptions): string {
  let charset = "";
  if (options.uppercase) charset += CHAR_SETS.uppercase;
  if (options.lowercase) charset += CHAR_SETS.lowercase;
  if (options.numbers) charset += CHAR_SETS.numbers;
  if (options.special) charset += CHAR_SETS.special;

  if (charset === "") return "";

  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[secureRandomInt(charset.length)];
  }
  return password;
}

export function PasswordGeneratorClient() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? undefined : revealVariants(22);

  const [password, setPassword] = useState("");
  const [length, setLength] = useState(14);
  const [options, setOptions] = useState<CharsetOptions>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
  });
  const [copied, setCopied] = useState(false);

  const generatePassword = useCallback(() => {
    setPassword(buildPassword(length, options));
    setCopied(false);
  }, [length, options]);

  useEffect(() => {
    queueMicrotask(generatePassword);
  }, [generatePassword]);

  const toggleOption = (key: keyof CharsetOptions) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

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
          <h1>Password Generator</h1>
          <p>
            Generate highly secure, unpredictable passwords to keep your data safe.
            Stop relying on guessable phrases and protect every account you own.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primaryAction} onClick={() => generatePassword()}>
              <RefreshCwIcon className="mr-2" aria-hidden="true" size={16} /> Generate Another
            </button>
            <a className={styles.jumpLink} href="#best-practices">
              Learn best practices <ArrowRightIcon aria-hidden="true" />
            </a>
          </div>
        </motion.div>

        <motion.div className={styles.heroVisual} variants={staggerItem}>
          <div className="bg-[#F2F2F7] dark:bg-[#000000] p-6 rounded-[32px] space-y-4 border border-separator/50 shadow-[0_26px_70px_-54px_rgba(0,0,0,0.44)] relative">
            <div className="bg-card shadow-sm rounded-[22px] border border-separator p-6 flex flex-col items-center justify-center relative min-h-[140px]">
              <p className="text-2xl sm:text-3xl font-mono text-center break-all select-all font-semibold text-foreground tracking-wider leading-relaxed px-4">
                {password || "Select options to generate"}
              </p>
            </div>

            <div className="bg-card shadow-sm rounded-[22px] border border-separator">
              <div className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <span className="font-semibold text-[14px]">Length</span>
                  <span className="text-[14px] text-muted-foreground font-mono bg-separator/30 px-2 py-0.5 rounded-md">{length}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="128"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-separator rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_2px_5px_rgba(0,0,0,0.3)] cursor-pointer"
                />
              </div>

              <div className="h-px bg-separator/50 w-full" />

              <div className="divide-y divide-separator/50">
                {[
                  { key: "uppercase", label: "Uppercase", desc: "Include A-Z", color: "bg-blue-500", char: "A" },
                  { key: "lowercase", label: "Lowercase", desc: "Include a-z", color: "bg-green-500", char: "a" },
                  { key: "numbers", label: "Numbers", desc: "Include 0-9", color: "bg-orange-500", char: "1" },
                  { key: "special", label: "Special", desc: "Include !@#$", color: "bg-purple-500", char: "!" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center text-white ${item.color} w-8 h-8 rounded-lg font-mono text-xs font-bold`}>
                        {item.char}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[14px]">{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.desc}</span>
                      </div>
                    </div>
                    <button
                      className={`settings-toggle ${options[item.key as keyof CharsetOptions] ? "is-on" : ""}`}
                      onClick={() => toggleOption(item.key as keyof CharsetOptions)}
                    >
                      <span />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={copyToClipboard} size="lg" className="w-full rounded-[14px] h-14 text-base font-semibold gap-2">
              {copied ? <><CheckIcon size={20} /> Copied to Clipboard!</> : <><CopyIcon size={20} /> Copy Password</>}
            </Button>
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
          <span>Maximum</span>
          <strong>Brute-force resistance</strong>
          <ShuffleIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Eliminating</span>
          <strong>Human bias</strong>
          <ShieldCheckIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Effortless</span>
          <strong>Per-account uniqueness</strong>
          <KeyIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Protection vs</span>
          <strong>Credential stuffing</strong>
          <ShieldAlertIcon aria-hidden="true" />
        </motion.article>
      </motion.section>

      <div id="best-practices" className={styles.story}>
        <motion.section
          className={styles.storyRow}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={reveal}
        >
          <div className={styles.sectionBody}>
            <p className={styles.sectionIndex}>01 · Why strength matters</p>
            <h2>Why do strong passwords really matter?</h2>
            <p>
              Data breaches happen more often than ever, and weak passwords are the
              primary vulnerability behind most of them. A strong, complex password
              acts as an uncrackable safe for your personal data, sharply reducing
              the risk of unauthorized access.
            </p>
          </div>
          <div className="bg-[var(--surface-alt-soft)] border border-[var(--line)] rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[340px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,122,255,0.1),transparent_70%)]" />
            <ShieldCheckIcon className="w-24 h-24 text-[var(--accent)] mb-6 relative z-10" />
            <p className="text-center font-medium text-[var(--ink)] z-10">A unique, random password per account limits any single breach to that one account.</p>
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
            <p className={styles.sectionIndex}>02 · Best practices</p>
            <h2>Best practices for unbreakable passwords</h2>
            <p>
              Many people still rely on easily guessable phrases, birth dates, or
              pet names, which makes them a prime target for automated cracking
              tools. Fully randomized, cryptographically secure passwords close
              that gap for every account you own.
            </p>
            <ol className={styles.accessSteps}>
              <li><span>1</span> Use 14+ characters when the site allows it</li>
              <li><span>2</span> Mix uppercase, lowercase, numbers, and symbols</li>
              <li><span>3</span> Never reuse a password across sites</li>
              <li><span>4</span> Store it in a vault instead of memorizing it</li>
            </ol>
          </div>
          <div className="bg-[var(--surface-alt-soft)] border border-[var(--line)] rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[340px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,59,48,0.08),transparent_70%)]" />
            <div className="bg-[var(--card-white)] border border-[var(--line)] shadow-sm rounded-xl p-4 w-full mb-4 opacity-50 relative z-10 line-through font-mono">
              summer2024
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
          <h2>Stop memorizing. Start securing.</h2>
          <p>Every password this tool generates can be saved straight into your Velora Vault, encrypted on your device before it ever reaches our servers.</p>
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
