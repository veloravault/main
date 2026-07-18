"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { uniqueNamesGenerator, adjectives, animals, colors, names } from "unique-names-generator";
import { secureRandomInt, secureRandomItem } from "@/lib/secureRandom";
import styles from "../utilities.module.css";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TimerIcon,
  BrainIcon,
  ShuffleIcon,
} from "lucide-react";
import {
  LANDING_VIEWPORT,
  HOVER_LIFT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "@/components/dreelio/motion";

const ALL_DICTS = [adjectives, colors, animals, names];

function resolveSeparator(separator: string): string {
  if (separator === "space") return " ";
  if (separator === "none") return "";
  return separator;
}

function buildPassphrase(wordsCount: number, separator: string, capitalize: boolean, includeNumber: boolean): string {
  const resolvedSeparator = resolveSeparator(separator);
  const selectedDicts = Array.from({ length: wordsCount }, () => secureRandomItem(ALL_DICTS));

  let generated = uniqueNamesGenerator({
    dictionaries: selectedDicts,
    separator: resolvedSeparator,
    length: wordsCount,
    style: capitalize ? "capital" : "lowerCase",
  });

  if (includeNumber) {
    generated += `${resolvedSeparator}${secureRandomInt(10)}`;
  }

  return generated;
}

export function PassphraseGeneratorClient() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? undefined : revealVariants(22);

  const [passphrase, setPassphrase] = useState("");
  const [wordsCount, setWordsCount] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(false);
  const [includeNumber, setIncludeNumber] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassphrase = useCallback(() => {
    setPassphrase(buildPassphrase(wordsCount, separator, capitalize, includeNumber));
    setCopied(false);
  }, [wordsCount, separator, capitalize, includeNumber]);

  useEffect(() => {
    queueMicrotask(generatePassphrase);
  }, [generatePassphrase]);

  const copyToClipboard = async () => {
    if (!passphrase) return;
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const separators = [
    { value: "-", label: "Hyphen" },
    { value: "space", label: "Space" },
    { value: ".", label: "Period" },
    { value: ",", label: "Comma" },
    { value: "none", label: "None" },
  ];

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
          <h1>Passphrase Generator</h1>
          <p>
            Generate highly secure, memorable passphrases from random dictionaries.
            A passphrase gives you the best of both worlds: real security and
            something you can actually remember.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primaryAction} onClick={() => generatePassphrase()}>
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
              <p className="text-xl sm:text-2xl font-mono text-center break-words select-all font-semibold text-foreground tracking-tight leading-snug max-w-full px-4">
                {passphrase || "Loading..."}
              </p>
            </div>

            <div className="bg-card shadow-sm rounded-[22px] border border-separator">
              <div className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <span className="font-semibold text-[14px]">Number of Words</span>
                  <span className="text-[14px] text-muted-foreground font-mono bg-separator/30 px-2 py-0.5 rounded-md">{wordsCount}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={wordsCount}
                  onChange={(e) => setWordsCount(Number(e.target.value))}
                  className="w-full accent-primary h-2 bg-separator rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_2px_5px_rgba(0,0,0,0.3)] cursor-pointer"
                />
              </div>

              <div className="h-px bg-separator/50 w-full" />

              <div className="p-4 flex flex-col gap-3">
                <span className="font-semibold text-[14px] px-1">Word Separator</span>
                <div className="flex bg-fill-tertiary p-1 rounded-[14px] overflow-hidden">
                  {separators.map((sep) => (
                    <button
                      key={sep.value}
                      onClick={() => setSeparator(sep.value)}
                      className={`flex-1 py-1.5 text-[12px] font-semibold rounded-[10px] transition-all duration-200 ${
                        separator === sep.value
                          ? "bg-elevated-bg text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {sep.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-separator/50 w-full" />

              <div className="divide-y divide-separator/50">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center text-white bg-blue-500 w-8 h-8 rounded-lg font-mono text-xs font-bold">Aa</span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[14px]">Capitalize Words</span>
                      <span className="text-xs text-muted-foreground">Title case format</span>
                    </div>
                  </div>
                  <button
                    className={`settings-toggle ${capitalize ? "is-on" : ""}`}
                    onClick={() => setCapitalize(!capitalize)}
                  >
                    <span />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center text-white bg-green-500 w-8 h-8 rounded-lg font-mono text-xs font-bold">#</span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[14px]">Include Number</span>
                      <span className="text-xs text-muted-foreground">Append a number</span>
                    </div>
                  </div>
                  <button
                    className={`settings-toggle ${includeNumber ? "is-on" : ""}`}
                    onClick={() => setIncludeNumber(!includeNumber)}
                  >
                    <span />
                  </button>
                </div>
              </div>
            </div>

            <Button onClick={copyToClipboard} size="lg" className="w-full rounded-[14px] h-14 text-base font-semibold gap-2">
              {copied ? <><CheckIcon size={20} /> Copied to Clipboard!</> : <><CopyIcon size={20} /> Copy Passphrase</>}
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
          <span>Exceptional</span>
          <strong>Length beats complexity</strong>
          <TimerIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Easy</span>
          <strong>Human recall</strong>
          <BrainIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>True</span>
          <strong>Dictionary randomness</strong>
          <ShuffleIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Built for</span>
          <strong>Manual typing</strong>
          <ShieldCheckIcon aria-hidden="true" />
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
            <p className={styles.sectionIndex}>01 · Why length wins</p>
            <h2>Why do passphrases matter for online security?</h2>
            <p>
              Passphrases combine several random words into a string that is
              incredibly long, yet surprisingly easy for a person to remember.
              In cybersecurity, length is one of the biggest factors in
              thwarting brute-force attacks.
            </p>
          </div>
          <div className="bg-[var(--surface-alt-soft)] border border-[var(--line)] rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[340px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(88,86,214,0.1),transparent_70%)]" />
            <TimerIcon className="w-24 h-24 text-[var(--accent)] mb-6 relative z-10" />
            <p className="text-center font-medium text-[var(--ink)] z-10">Every extra random word multiplies the guesses an attacker needs, not just adds to them.</p>
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
            <h2>Best practices for secure passphrases</h2>
            <p>
              Passphrases are strong because of their length, but they can be
              vulnerable if they use common idioms, famous quotes, or
              predictable sequences. To maximize security, every word should be
              chosen completely at random from a diverse dictionary.
            </p>
            <ol className={styles.accessSteps}>
              <li><span>1</span> Use at least 4 random, unrelated words</li>
              <li><span>2</span> Avoid quotes, idioms, and song lyrics</li>
              <li><span>3</span> Add a separator or number for extra entropy</li>
              <li><span>4</span> Never reuse a passphrase across accounts</li>
            </ol>
          </div>
          <div className="bg-[var(--surface-alt-soft)] border border-[var(--line)] rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[340px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,59,48,0.08),transparent_70%)]" />
            <div className="bg-[var(--card-white)] border border-[var(--line)] shadow-sm rounded-xl p-4 w-full mb-4 opacity-50 relative z-10 line-through font-mono text-sm">
              to-be-or-not-to-be
            </div>
            <div className="bg-[var(--card-white)] border-2 border-[var(--accent)] shadow-sm rounded-xl p-4 w-full relative z-10">
              <span className="text-[var(--accent)] font-mono font-bold tracking-tight break-words">casual-outrage-apricot-deina</span>
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
          <p>Save every passphrase straight into your Velora Vault, encrypted on your device before it ever reaches our servers.</p>
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
