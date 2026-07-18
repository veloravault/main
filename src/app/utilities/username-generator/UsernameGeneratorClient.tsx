"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { uniqueNamesGenerator, adjectives, animals, colors, names } from "unique-names-generator";
import { secureRandomInt, secureRandomItem } from "@/lib/secureRandom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, CheckIcon, KeyIcon, ShieldCheckIcon, UserIcon, CopyIcon, RefreshCwIcon, ShuffleIcon } from "lucide-react";
import styles from "@/app/utilities/utilities.module.css";
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

const ALL_DICTS = [adjectives, colors, animals, names];

function buildWordUsername(capitalize: boolean, includeNumber: boolean): string {
  const selectedDicts = Array.from({ length: 2 }, () => secureRandomItem(ALL_DICTS));

  let generated = uniqueNamesGenerator({
    dictionaries: selectedDicts,
    separator: "",
    length: 2,
    style: capitalize ? "capital" : "lowerCase",
  });

  if (includeNumber) generated += secureRandomInt(1000);
  return generated;
}

function buildStringUsername(length: number, options: CharsetOptions): string {
  let charset = "";
  if (options.uppercase) charset += CHAR_SETS.uppercase;
  if (options.lowercase) charset += CHAR_SETS.lowercase;
  if (options.numbers) charset += CHAR_SETS.numbers;
  if (options.special) charset += CHAR_SETS.special;

  if (charset === "") return "";

  let generated = "";
  for (let i = 0; i < length; i++) {
    generated += charset[secureRandomInt(charset.length)];
  }
  return generated;
}

export function UsernameGeneratorClient() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? undefined : revealVariants(22);

  const [username, setUsername] = useState("");
  const [type, setType] = useState<"word" | "string">("word");

  // Word options
  const [capitalize, setCapitalize] = useState(false);
  const [includeNumber, setIncludeNumber] = useState(true);

  // String options
  const [length, setLength] = useState(8);
  const [options, setOptions] = useState<CharsetOptions>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: false,
  });

  const [copied, setCopied] = useState(false);

  const generateUsername = useCallback(() => {
    const generated = type === "word"
      ? buildWordUsername(capitalize, includeNumber)
      : buildStringUsername(length, options);

    setUsername(generated);
    setCopied(false);
  }, [type, capitalize, includeNumber, length, options]);

  useEffect(() => {
    queueMicrotask(generateUsername);
  }, [generateUsername]);

  const toggleOption = (key: keyof CharsetOptions) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  };

  const copyToClipboard = async () => {
    if (!username) return;
    try {
      await navigator.clipboard.writeText(username);
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
          <h1>Username Generator</h1>
          <p>
            Generate secure, random usernames instantly. Protect your privacy online by avoiding predictable names and keeping your personal identity disconnected from your accounts.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primaryAction} onClick={() => generateUsername()}>
              <RefreshCwIcon className="mr-2" aria-hidden="true" size={16} /> Generate Another
            </button>
            <a className={styles.jumpLink} href="#best-practices">
              Learn best practices <ArrowRightIcon aria-hidden="true" />
            </a>
          </div>
        </motion.div>
        <motion.div className={styles.heroVisual} variants={staggerItem}>
          <div className="bg-[#F2F2F7] dark:bg-[#000000] p-6 rounded-[32px] space-y-6 border border-separator/50 shadow-[0_26px_70px_-54px_rgba(0,0,0,0.44)] relative">
            {/* Display */}
            <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator p-8 flex flex-col items-center justify-center relative min-h-[140px]">
              <p className="text-3xl font-mono text-center break-all select-all font-semibold text-foreground tracking-tight leading-snug">
                {username || "Loading..."}
              </p>
            </div>

            {/* Config */}
            <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator">
              <div className="p-4 sm:px-5 sm:py-5 flex flex-col gap-3">
                <span className="font-semibold text-[15px]">Username Type</span>
                <div className="flex bg-fill-tertiary p-1 rounded-[14px] overflow-hidden">
                  <button
                    onClick={() => setType("word")}
                    className={`flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all duration-200 ${
                      type === "word" ? "bg-elevated-bg text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Random Word
                  </button>
                  <button
                    onClick={() => setType("string")}
                    className={`flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all duration-200 ${
                      type === "string" ? "bg-elevated-bg text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Random String
                  </button>
                </div>
              </div>

              <div className="h-px bg-separator ml-4" />

              {type === "word" ? (
                <>
                  <div className="settings-control-row sm:px-5">
                    <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg font-mono text-xs font-bold">Aa</span>
                    <span>
                      <strong>Capitalize</strong>
                      <small>Use Title Case format</small>
                    </span>
                    <button className={`settings-toggle ${capitalize ? 'is-on' : ''}`} onClick={() => setCapitalize(!capitalize)}><span /></button>
                  </div>
                  <div className="h-px bg-separator ml-14" />
                  <div className="settings-control-row sm:px-5">
                    <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg font-mono text-xs font-bold">#</span>
                    <span>
                      <strong>Include Number</strong>
                      <small>Append a random number</small>
                    </span>
                    <button className={`settings-toggle ${includeNumber ? 'is-on' : ''}`} onClick={() => setIncludeNumber(!includeNumber)}><span /></button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 sm:px-5 sm:py-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[15px]">Length</span>
                      <span className="text-[15px] text-muted-foreground font-mono">{length}</span>
                    </div>
                    <input type="range" min="4" max="64" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full accent-primary h-2 bg-separator rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_2px_5px_rgba(0,0,0,0.3)] cursor-pointer" />
                  </div>
                  <div className="h-px bg-separator ml-14" />
                  <div className="settings-control-row sm:px-5">
                    <span className="flex items-center justify-center text-white bg-blue-500 w-8 h-8 rounded-lg font-mono text-xs font-bold">A</span>
                    <span><strong>Uppercase</strong><small>Include A-Z</small></span>
                    <button className={`settings-toggle ${options.uppercase ? 'is-on' : ''}`} onClick={() => toggleOption('uppercase')}><span /></button>
                  </div>
                  <div className="h-px bg-separator ml-14" />
                  <div className="settings-control-row sm:px-5">
                    <span className="flex items-center justify-center text-white bg-indigo-500 w-8 h-8 rounded-lg font-mono text-xs font-bold">a</span>
                    <span><strong>Lowercase</strong><small>Include a-z</small></span>
                    <button className={`settings-toggle ${options.lowercase ? 'is-on' : ''}`} onClick={() => toggleOption('lowercase')}><span /></button>
                  </div>
                  <div className="h-px bg-separator ml-14" />
                  <div className="settings-control-row sm:px-5">
                    <span className="flex items-center justify-center text-white bg-green-500 w-8 h-8 rounded-lg font-mono text-xs font-bold">1</span>
                    <span><strong>Numbers</strong><small>Include 0-9</small></span>
                    <button className={`settings-toggle ${options.numbers ? 'is-on' : ''}`} onClick={() => toggleOption('numbers')}><span /></button>
                  </div>
                  <div className="h-px bg-separator ml-14" />
                  <div className="settings-control-row sm:px-5">
                    <span className="flex items-center justify-center text-white bg-orange-500 w-8 h-8 rounded-lg font-mono text-xs font-bold">!</span>
                    <span><strong>Special</strong><small>Include !@#$%^&*</small></span>
                    <button className={`settings-toggle ${options.special ? 'is-on' : ''}`} onClick={() => toggleOption('special')}><span /></button>
                  </div>
                </>
              )}
            </div>

            <Button onClick={copyToClipboard} size="lg" className="w-full rounded-[14px] h-14 text-base font-semibold gap-2">
              {copied ? <><CheckIcon size={20} /> Copied to Clipboard!</> : <><CopyIcon size={20} /> Copy Username</>}
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
          <span>Reduced</span>
          <strong>Predictability</strong>
          <ShuffleIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Protection vs</span>
          <strong>Credential Stuffing</strong>
          <ShieldCheckIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Resistance</span>
          <strong>Phishing attempts</strong>
          <KeyIcon aria-hidden="true" />
        </motion.article>
        <motion.article className={styles.fact} variants={staggerItem}>
          <span>Privacy</span>
          <strong>Anonymity online</strong>
          <UserIcon aria-hidden="true" />
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
            <p className={styles.sectionIndex}>01 · The first line of defense</p>
            <h2>Does your username really matter for online security?</h2>
            <p>
              Yes, compromised credentials account for a vast majority of data breaches. A secure username acts as the first line of defense, decreasing the risk of unauthorized access and protecting your personal information.
            </p>
            <p>
              Even more, a random, unique username adds an extra layer of security, similar to having an unlisted phone number. It prevents attackers from profiling you across different services based on a common username.
            </p>
          </div>
          <div className="bg-[var(--surface-alt-soft)] border border-[var(--line)] rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[340px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,122,255,0.1),transparent_70%)]" />
            <ShieldCheckIcon className="w-24 h-24 text-[var(--accent)] mb-6 relative z-10" />
            <p className="text-center font-medium text-[var(--ink)] z-10">Stop unauthorized access before they even reach the password.</p>
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
            <p className={styles.sectionIndex}>02 · Username strategy</p>
            <h2>Best practices for creating secure usernames.</h2>
            <p>
              Usernames often tell a lot about you. Many users include personal information like their full name, birth year, favorite hobbies, sports teams, and more, making you more susceptible to cyberattacks.
            </p>
            <ol className={styles.accessSteps}>
              <li><span>1</span> Combine randomness & memorability</li>
              <li><span>2</span> Never use your full name</li>
              <li><span>3</span> Avoid birthdates & addresses</li>
              <li><span>4</span> Avoid hobbies & personal traits</li>
            </ol>
          </div>
          <div className="bg-[var(--surface-alt-soft)] border border-[var(--line)] rounded-[32px] p-10 flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[340px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,59,48,0.08),transparent_70%)]" />
            <div className="bg-[var(--card-white)] border border-[var(--line)] shadow-sm rounded-xl p-4 w-full mb-4 opacity-50 relative z-10 line-through">
              john.doe.1990
            </div>
            <div className="bg-[var(--card-white)] border-2 border-[var(--accent)] shadow-sm rounded-xl p-4 w-full relative z-10">
              <span className="text-[var(--accent)] font-mono font-bold tracking-tight">SilentElephant942</span>
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
          <p>Let go of trying to remember every username, password, or passphrase. With Velora Vault, you can securely store logins for all your accounts.</p>
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
