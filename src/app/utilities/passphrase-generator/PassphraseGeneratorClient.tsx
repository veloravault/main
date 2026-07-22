"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BrainIcon,
  ShieldCheckIcon,
  TimerIcon,
} from "lucide-react";
import { adjectives, animals, colors, names } from "unique-names-generator";
import { secureRandomInt, secureRandomItem } from "@/lib/secureRandom";
import { formatPassphrase } from "../generatorLogic";
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

type Separator = "-" | " " | "." | "," | "";

const ALL_WORDS = [...adjectives, ...colors, ...animals, ...names];

const SEPARATORS: readonly { value: Separator; label: string }[] = [
  { value: "-", label: "Hyphen" },
  { value: " ", label: "Space" },
  { value: ".", label: "Period" },
  { value: ",", label: "Comma" },
  { value: "", label: "None" },
];

export function PassphraseGeneratorClient() {
  const [passphrase, setPassphrase] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [numberSuffix, setNumberSuffix] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState<Separator>("-");
  const [capitalize, setCapitalize] = useState(false);
  const [includeNumber, setIncludeNumber] = useState(false);
  const [generation, setGeneration] = useState(0);
  const clipboard = useUtilityClipboard(passphrase);

  const selectRandomParts = useCallback(() => {
    setSelectedWords(
      Array.from({ length: wordCount }, () => secureRandomItem(ALL_WORDS)),
    );
    setNumberSuffix(secureRandomInt(10));
  }, [wordCount]);

  useEffect(() => {
    let active = true;
    void generation;
    queueMicrotask(() => {
      if (active) selectRandomParts();
    });
    return () => {
      active = false;
    };
  }, [generation, selectRandomParts]);

  const formatCurrentPassphrase = useCallback(() => {
    if (selectedWords.length === 0 || numberSuffix === null) return;
    setPassphrase(
      formatPassphrase(
        selectedWords,
        separator,
        capitalize,
        includeNumber,
        () => numberSuffix,
      ),
    );
  }, [capitalize, includeNumber, numberSuffix, selectedWords, separator]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) formatCurrentPassphrase();
    });
    return () => {
      active = false;
    };
  }, [formatCurrentPassphrase]);

  function changeWordCount(value: number) {
    clipboard.reset();
    setWordCount(value);
  }

  function changeSeparator(value: Separator) {
    clipboard.reset();
    setSeparator(value);
  }

  function changeCapitalize() {
    clipboard.reset();
    setCapitalize((current) => !current);
  }

  function changeIncludeNumber() {
    clipboard.reset();
    setIncludeNumber((current) => !current);
  }

  function regenerate() {
    clipboard.reset();
    setGeneration((current) => current + 1);
  }

  const workbench = (
    <UtilityWorkbench
      title="Create a memorable passphrase"
      description="Combine unrelated words locally, then choose the format that fits the account."
    >
      <div className={styles.workbenchBody}>
        <div className={styles.controlsPanel}>
          <UtilityRange
            id="passphrase-word-count"
            label="Number of words"
            value={wordCount}
            min={3}
            max={20}
            onChange={changeWordCount}
          />
          <UtilitySegments
            label="Word separator"
            value={separator}
            options={SEPARATORS}
            onChange={changeSeparator}
          />
          <UtilitySwitch
            id="passphrase-capitalize"
            label="Capitalize words"
            description="Use title case"
            checked={capitalize}
            onChange={changeCapitalize}
          />
          <UtilitySwitch
            id="passphrase-number"
            label="Include a number"
            description="Append one random digit"
            checked={includeNumber}
            onChange={changeIncludeNumber}
          />
        </div>
        <UtilityOutput
          value={passphrase || "Generating…"}
          label="Generated passphrase"
          outputRef={clipboard.outputRef}
          onCopy={clipboard.copy}
          onRegenerate={regenerate}
          status={clipboard.status}
        />
      </div>
    </UtilityWorkbench>
  );

  return (
    <UtilityPageLayout
      slug="passphrase-generator"
      title="Passphrase Generator"
      description="Build a long credential from unrelated random words—easier to type, while still generated securely in your browser."
      workbench={workbench}
      benefits={[
        {
          eyebrow: "Long",
          title: "Length adds resistance",
          description:
            "Each additional random word expands the number of possible combinations.",
          icon: <TimerIcon aria-hidden="true" />,
        },
        {
          eyebrow: "Memorable",
          title: "Friendlier to recall",
          description:
            "Distinct words can be easier to remember and enter than dense character strings.",
          icon: <BrainIcon aria-hidden="true" />,
        },
        {
          eyebrow: "Private",
          title: "Chosen locally",
          description:
            "Secure random selection happens in this browser and is never transmitted.",
          icon: <ShieldCheckIcon aria-hidden="true" />,
        },
      ]}
      education={[
        {
          eyebrow: "01 · Why length wins",
          title: "Unrelated words create useful distance.",
          body: (
            <p>
              A passphrase gains strength from randomly selected words and the
              size of the dictionary behind them. Familiar quotations and sayings
              do not provide the same protection because attackers can predict
              their order.
            </p>
          ),
          aside: (
            <ul className={styles.exampleStack}>
              <li>Use at least four unrelated words.</li>
              <li>Choose a separator accepted by the service.</li>
              <li>Add more words before adding predictable substitutions.</li>
            </ul>
          ),
        },
        {
          eyebrow: "02 · Best practices",
          title: "Keep memorable credentials unpredictable.",
          body: (
            <p>
              Use a passphrase when you may need to type or remember the value,
              but still keep it unique. For credentials you never need to enter
              manually, the password generator is often the simpler choice.
            </p>
          ),
          aside: (
            <ul className={styles.bestPracticeList}>
              <li>Avoid lyrics, quotations, idioms, and personal details.</li>
              <li>Never reuse a passphrase across accounts.</li>
              <li>Store the final value in an encrypted vault.</li>
              <li>Turn on multi-factor authentication when available.</li>
            </ul>
          ),
        },
      ]}
      ctaTitle="Remember one vault, not every passphrase."
      ctaDescription="Create a Velora Vault account to organize credentials in an encrypted vault. This generator saves nothing unless you choose to add it."
    />
  );
}
