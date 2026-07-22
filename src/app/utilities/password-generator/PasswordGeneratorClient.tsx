"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyIcon,
  ShieldCheckIcon,
  ShuffleIcon,
} from "lucide-react";
import { secureRandomInt } from "@/lib/secureRandom";
import {
  buildPassword,
  getGeneratorStrength,
  toggleCharacterOption,
  type CharacterOption,
  type CharacterOptions,
} from "../generatorLogic";
import { UtilityPageLayout } from "../UtilityPageLayout";
import {
  UtilityOutput,
  UtilityRange,
  UtilitySwitch,
  UtilityWorkbench,
} from "../UtilityWorkbench";
import { useUtilityClipboard } from "../useUtilityClipboard";
import styles from "../utilities.module.css";

const OPTION_ROWS: readonly {
  key: CharacterOption;
  label: string;
  description: string;
}[] = [
  { key: "uppercase", label: "Uppercase", description: "Include A–Z" },
  { key: "lowercase", label: "Lowercase", description: "Include a–z" },
  { key: "numbers", label: "Numbers", description: "Include 0–9" },
  { key: "special", label: "Symbols", description: "Include punctuation" },
];

export function PasswordGeneratorClient() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(14);
  const [options, setOptions] = useState<CharacterOptions>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
  });
  const [optionHint, setOptionHint] = useState("");
  const [generation, setGeneration] = useState(0);
  const clipboard = useUtilityClipboard(password);

  const generatePassword = useCallback(() => {
    setPassword(buildPassword(length, options, secureRandomInt));
  }, [length, options]);

  useEffect(() => {
    let active = true;
    void generation;
    queueMicrotask(() => {
      if (active) generatePassword();
    });
    return () => {
      active = false;
    };
  }, [generatePassword, generation]);

  function changeLength(value: number) {
    clipboard.reset();
    setLength(value);
  }

  function changeOption(key: CharacterOption) {
    const result = toggleCharacterOption(options, key);
    clipboard.reset();
    setOptions(result.options);
    setOptionHint(
      result.blocked ? "Keep at least one character type enabled." : "",
    );
  }

  function regenerate() {
    clipboard.reset();
    setGeneration((current) => current + 1);
  }

  const strength = getGeneratorStrength(
    length,
    Object.values(options).filter(Boolean).length,
  );

  const workbench = (
    <UtilityWorkbench
      title="Create a random password"
      description="Adjust the settings, then copy a password generated entirely in this browser."
    >
      <div className={styles.workbenchBody}>
        <div className={styles.controlsPanel}>
          <UtilityRange
            id="password-length"
            label="Password length"
            value={length}
            min={5}
            max={128}
            onChange={changeLength}
          />
          {OPTION_ROWS.map((option) => (
            <UtilitySwitch
              key={option.key}
              id={`password-${option.key}`}
              label={option.label}
              description={option.description}
              checked={options[option.key]}
              onChange={() => changeOption(option.key)}
            />
          ))}
          <div className={styles.feedbackPanel}>
            <p>
              Strength guidance: <strong>{strength.label}</strong>
            </p>
            <div
              className={styles.strengthMeter}
              data-score={strength.level}
              role="img"
              aria-label={`Password strength: ${strength.label}`}
            >
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} aria-hidden="true" />
              ))}
            </div>
            <p aria-live="polite">{optionHint}</p>
          </div>
        </div>
        <UtilityOutput
          value={password || "Generating…"}
          label="Generated password"
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
      slug="password-generator"
      title="Password Generator"
      description="Create a strong, unpredictable password for each account without sending the result anywhere."
      workbench={workbench}
      benefits={[
        {
          eyebrow: "Cryptographic",
          title: "Random by design",
          description:
            "Secure browser randomness removes the patterns people tend to introduce.",
          icon: <ShuffleIcon aria-hidden="true" />,
        },
        {
          eyebrow: "Unique",
          title: "One password per account",
          description:
            "A fresh credential helps contain the damage if another service is breached.",
          icon: <KeyIcon aria-hidden="true" />,
        },
        {
          eyebrow: "Private",
          title: "Generated locally",
          description:
            "The password stays in this browser unless you explicitly copy it.",
          icon: <ShieldCheckIcon aria-hidden="true" />,
        },
      ]}
      education={[
        {
          eyebrow: "01 · Why randomness matters",
          title: "Make automated guessing expensive.",
          body: (
            <p>
              People reuse familiar words, dates, and keyboard patterns. A longer
              password selected with secure randomness gives guessing tools far
              less structure to exploit.
            </p>
          ),
          aside: (
            <ul className={styles.exampleStack}>
              <li>Prefer 14 or more characters when a service allows it.</li>
              <li>Keep every enabled character type truly random.</li>
              <li>Use the dedicated strength tester for deeper feedback.</li>
            </ul>
          ),
        },
        {
          eyebrow: "02 · Best practices",
          title: "Treat every account as a separate lock.",
          body: (
            <p>
              Even a strong password becomes risky when it is reused. Generate a
              different value for every login and store it in an encrypted vault
              instead of relying on memory.
            </p>
          ),
          aside: (
            <ul className={styles.bestPracticeList}>
              <li>Never reuse a password across services.</li>
              <li>Turn on multi-factor authentication when available.</li>
              <li>Replace credentials exposed in a breach promptly.</li>
              <li>Do not send passwords through messages or email.</li>
            </ul>
          ),
        },
      ]}
      ctaTitle="Give every password a protected home."
      ctaDescription="Create a Velora Vault account to organize credentials in an encrypted vault. Generated passwords are saved only when you choose to add them."
    />
  );
}
