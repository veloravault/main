"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FingerprintIcon,
  ShieldCheckIcon,
  ShuffleIcon,
} from "lucide-react";
import { adjectives, animals, colors, names } from "unique-names-generator";
import { secureRandomInt, secureRandomItem } from "@/lib/secureRandom";
import {
  buildRandomString,
  formatWordUsername,
  toggleCharacterOption,
  type CharacterOption,
  type CharacterOptions,
} from "../generatorLogic";
import { UtilityPageLayout } from "../UtilityPageLayout";
import {
  UtilityOutput,
  UtilityRange,
  UtilitySegments,
  UtilitySwitch,
  UtilityWorkbench,
} from "../UtilityWorkbench";
import { useUtilityClipboard } from "../useUtilityClipboard";
import styles from "../utilities.module.css";

type WordSeparator = "" | "-" | "." | "_";
type StringCharacterOption = Exclude<CharacterOption, "special">;

const ALL_WORDS = [...adjectives, ...colors, ...animals, ...names];

const MODE_OPTIONS = [
  { value: "words", label: "Readable words" },
  { value: "string", label: "Random string" },
] as const;

const WORD_SEPARATORS: readonly { value: WordSeparator; label: string }[] = [
  { value: "", label: "None" },
  { value: "-", label: "Hyphen" },
  { value: ".", label: "Period" },
  { value: "_", label: "Underscore" },
];

const STRING_OPTIONS: readonly {
  key: StringCharacterOption;
  label: string;
  description: string;
}[] = [
  { key: "uppercase", label: "Uppercase", description: "Include A–Z" },
  { key: "lowercase", label: "Lowercase", description: "Include a–z" },
  { key: "numbers", label: "Numbers", description: "Include 0–9" },
];

export function UsernameGeneratorClient() {
  const [mode, setMode] = useState<"words" | "string">("words");
  const [wordCount, setWordCount] = useState(2);
  const [wordSeparator, setWordSeparator] = useState<"" | "-" | "." | "_">("");
  const [capitalize, setCapitalize] = useState(false);
  const [includeNumber, setIncludeNumber] = useState(true);
  const [length, setLength] = useState(12);
  const [options, setOptions] = useState<CharacterOptions>({ uppercase: true, lowercase: true, numbers: true, special: false });
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [numberSuffix, setNumberSuffix] = useState<number | null>(null);
  const [wordUsername, setWordUsername] = useState("");
  const [stringUsername, setStringUsername] = useState("");
  const [wordGeneration, setWordGeneration] = useState(0);
  const [stringGeneration, setStringGeneration] = useState(0);
  const [optionHint, setOptionHint] = useState("");
  const username = mode === "words" ? wordUsername : stringUsername;
  const clipboard = useUtilityClipboard(username);

  const selectRandomParts = useCallback(() => {
    setSelectedWords(
      Array.from({ length: wordCount }, () => secureRandomItem(ALL_WORDS)),
    );
    setNumberSuffix(secureRandomInt(1000));
  }, [wordCount]);

  useEffect(() => {
    let active = true;
    void wordGeneration;
    queueMicrotask(() => {
      if (active) selectRandomParts();
    });
    return () => {
      active = false;
    };
  }, [selectRandomParts, wordGeneration]);

  const formatCurrentWordUsername = useCallback(() => {
    if (selectedWords.length === 0 || numberSuffix === null) return;
    setWordUsername(
      formatWordUsername(
        selectedWords,
        wordSeparator,
        capitalize,
        includeNumber,
        () => numberSuffix,
      ),
    );
  }, [capitalize, includeNumber, numberSuffix, selectedWords, wordSeparator]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) formatCurrentWordUsername();
    });
    return () => {
      active = false;
    };
  }, [formatCurrentWordUsername]);

  const generateRandomString = useCallback(() => {
    setStringUsername(buildRandomString(length, options, secureRandomInt));
  }, [length, options]);

  useEffect(() => {
    let active = true;
    void stringGeneration;
    queueMicrotask(() => {
      if (active) generateRandomString();
    });
    return () => {
      active = false;
    };
  }, [generateRandomString, stringGeneration]);

  function changeMode(nextMode: "words" | "string") {
    clipboard.reset();
    setOptionHint("");
    setMode(nextMode);
  }

  function changeWordCount(value: number) {
    clipboard.reset();
    setWordCount(value);
  }

  function changeWordSeparator(value: WordSeparator) {
    clipboard.reset();
    setWordSeparator(value);
  }

  function changeStringOption(key: StringCharacterOption) {
    const result = toggleCharacterOption(options, key);
    clipboard.reset();
    setOptions(result.options);
    setOptionHint(
      result.blocked ? "Keep at least one character type enabled." : "",
    );
  }

  function regenerate() {
    clipboard.reset();
    if (mode === "words") {
      setWordGeneration((current) => current + 1);
    } else {
      setStringGeneration((current) => current + 1);
    }
  }

  const workbench = (
    <UtilityWorkbench
      title="Create a private username"
      description="Choose readable words or a compact random string. Both are generated locally with secure browser randomness."
    >
      <div className={styles.workbenchBody}>
        <UtilityOutput
          value={username || "Generating…"}
          label="Generated username"
          outputRef={clipboard.outputRef}
          onCopy={clipboard.copy}
          onRegenerate={regenerate}
          status={clipboard.status}
        />
        <div className={styles.controlsPanel}>
          <UtilitySegments
            label="Username mode"
            value={mode}
            options={MODE_OPTIONS}
            onChange={changeMode}
          />
          {mode === "words" ? (
            <>
              <UtilityRange
                id="username-word-count"
                label="Number of words"
                value={wordCount}
                min={2}
                max={5}
                onChange={changeWordCount}
              />
              <UtilitySegments
                label="Word separator"
                value={wordSeparator}
                options={WORD_SEPARATORS}
                onChange={changeWordSeparator}
              />
              <UtilitySwitch
                id="username-capitalize"
                label="Capitalize words"
                description="Use title case"
                checked={capitalize}
                onChange={() => {
                  clipboard.reset();
                  setCapitalize((current) => !current);
                }}
              />
              <UtilitySwitch
                id="username-number"
                label="Include a number"
                description="Append a random value from 0–999"
                checked={includeNumber}
                onChange={() => {
                  clipboard.reset();
                  setIncludeNumber((current) => !current);
                }}
              />
            </>
          ) : (
            <>
              <UtilityRange
                id="username-string-length"
                label="String length"
                value={length}
                min={4}
                max={64}
                onChange={(value) => {
                  clipboard.reset();
                  setLength(value);
                }}
              />
              {STRING_OPTIONS.map((option) => (
                <UtilitySwitch
                  key={option.key}
                  id={`username-${option.key}`}
                  label={option.label}
                  description={option.description}
                  checked={options[option.key]}
                  onChange={() => changeStringOption(option.key)}
                />
              ))}
              <p className={styles.srStatus} aria-live="polite">
                {optionHint}
              </p>
            </>
          )}
        </div>
      </div>
    </UtilityWorkbench>
  );

  return (
    <UtilityPageLayout
      slug="username-generator"
      title="Username Generator"
      description="Create an unpredictable online identity without exposing names, dates, or other personal details."
      workbench={workbench}
      benefits={[
        {
          eyebrow: "Unlinkable",
          title: "Separate your identities",
          description:
            "A unique username makes it harder to connect your activity across unrelated services.",
          icon: <FingerprintIcon aria-hidden="true" />,
        },
        {
          eyebrow: "Unpredictable",
          title: "Avoid personal patterns",
          description:
            "Secure randomness replaces birthdays, names, and handles that attackers can research.",
          icon: <ShuffleIcon aria-hidden="true" />,
        },
        {
          eyebrow: "Private",
          title: "Generated on this device",
          description:
            "Your username stays in this browser unless you explicitly copy it.",
          icon: <ShieldCheckIcon aria-hidden="true" />,
        },
      ]}
      education={[
        {
          eyebrow: "01 · Why usernames matter",
          title: "A public identifier can still reveal too much.",
          body: (
            <p>
              Reusing the same handle lets data brokers, scammers, and attackers
              connect accounts that were meant to stay separate. A fresh random
              username reduces that trail without pretending a username is secret.
            </p>
          ),
          aside: (
            <ul className={styles.exampleStack}>
              <li>Avoid full names, initials, and birth years.</li>
              <li>Use a different username for sensitive accounts.</li>
              <li>Keep recovery details private even when the handle is public.</li>
            </ul>
          ),
        },
        {
          eyebrow: "02 · Choose the right mode",
          title: "Balance memorability with anonymity.",
          body: (
            <p>
              Readable words are easier to recognize and communicate. Random
              strings are more compact and reveal even less semantic information.
              Either mode is strongest when you do not reuse its result elsewhere.
            </p>
          ),
          aside: (
            <ul className={styles.bestPracticeList}>
              <li>Use readable words for communities and casual accounts.</li>
              <li>Use random strings when maximum unlinkability matters.</li>
              <li>Pair every username with a unique generated password.</li>
              <li>Store account identifiers in an encrypted vault.</li>
            </ul>
          ),
        },
      ]}
      ctaTitle="Keep every identity organized and protected."
      ctaDescription="Create a Velora Vault account to store unique usernames beside their matching credentials. This generator saves nothing on its own."
    />
  );
}
