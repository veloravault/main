"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { uniqueNamesGenerator, adjectives, animals, colors, names } from "unique-names-generator";
import { secureRandomInt, secureRandomItem } from "@/lib/secureRandom";

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

  // Passphrase generation must stay client-only (never rendered during SSR),
  // so this defers into a microtask rather than calling setState directly
  // in the effect body.
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
    <div className="apple-surface bg-[#F2F2F7] dark:bg-[#000000] p-4 sm:p-8 rounded-[32px] space-y-8 max-w-2xl mx-auto w-full border border-separator/50">
      {/* Hero Display */}
      <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator p-6 sm:p-10 flex flex-col items-center justify-center relative min-h-[160px]">
        <button
          onClick={generatePassphrase}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-fill-secondary rounded-full transition-colors"
          title="Regenerate"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
        </button>

        <p className="text-3xl sm:text-4xl font-mono text-center break-words select-all font-semibold text-foreground tracking-tight leading-snug max-w-full">
          {passphrase || "Loading..."}
        </p>
      </div>

      {/* Settings Group */}
      <div className="space-y-4">
        <h2 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Configuration
        </h2>

        <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator">

          {/* Word Count Slider Row */}
          <div className="p-4 sm:px-5 sm:py-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[15px]">Number of Words</span>
              <span className="text-[15px] text-muted-foreground font-mono">{wordsCount}</span>
            </div>
            <input
              type="range"
              min="3"
              max="20"
              value={wordsCount}
              onChange={(e) => setWordsCount(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-separator rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_2px_5px_rgba(0,0,0,0.3)] cursor-pointer"
            />
          </div>

          <div className="h-px bg-separator ml-14" />

          {/* Separator Row */}
          <div className="p-4 sm:px-5 sm:py-5 flex flex-col gap-3">
            <span className="font-semibold text-[15px]">Word Separator</span>
            <div className="flex bg-fill-tertiary p-1 rounded-[14px] overflow-hidden">
              {separators.map((sep) => (
                <button
                  key={sep.value}
                  onClick={() => setSeparator(sep.value)}
                  className={`flex-1 py-1.5 text-[13px] font-semibold rounded-[10px] transition-all duration-200 ${
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

          <div className="h-px bg-separator ml-14" />

          {/* Capitalize Row */}
          <div className="settings-control-row sm:px-5">
            <span className="flex items-center justify-center text-white bg-blue-500 w-8 h-8 rounded-lg font-mono text-xs font-bold">Aa</span>
            <span>
              <strong>Capitalize Words</strong>
              <small>Title case for each word</small>
            </span>
            <button
              className={`settings-toggle ${capitalize ? 'is-on' : ''}`}
              onClick={() => setCapitalize(!capitalize)}
            >
              <span />
            </button>
          </div>

          <div className="h-px bg-separator ml-14" />

          {/* Include Number Row */}
          <div className="settings-control-row sm:px-5">
            <span className="flex items-center justify-center text-white bg-green-500 w-8 h-8 rounded-lg font-mono text-xs font-bold">#</span>
            <span>
              <strong>Include Number</strong>
              <small>Append a random number</small>
            </span>
            <button
              className={`settings-toggle ${includeNumber ? 'is-on' : ''}`}
              onClick={() => setIncludeNumber(!includeNumber)}
            >
              <span />
            </button>
          </div>

        </div>
      </div>

      <Button
        onClick={copyToClipboard}
        size="lg"
        className="w-full rounded-[14px] h-14 text-base font-semibold gap-2 mt-4"
      >
        {copied ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Copied to Clipboard!
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            Copy Passphrase
          </>
        )}
      </Button>

    </div>
  );
}
