"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { uniqueNamesGenerator, adjectives, animals, colors, names } from "unique-names-generator";
import { secureRandomInt, secureRandomItem } from "@/lib/secureRandom";

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

  // Username generation must stay client-only (never rendered during SSR),
  // so this defers into a microtask rather than calling setState directly
  // in the effect body.
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
    <div className="apple-surface space-y-8 max-w-2xl mx-auto w-full">
      {/* Hero Display */}
      <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator p-6 sm:p-10 flex flex-col items-center justify-center relative min-h-[160px]">
        <button
          onClick={generateUsername}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-fill-secondary rounded-full transition-colors"
          title="Regenerate"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
        </button>

        <p className="text-3xl sm:text-4xl font-mono text-center break-all select-all font-semibold text-foreground tracking-tight leading-snug">
          {username || "Loading..."}
        </p>
      </div>

      {/* Settings Group */}
      <div className="space-y-4">
        <h2 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Configuration
        </h2>

        <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator">

          {/* Type Segmented Control */}
          <div className="p-4 sm:px-5 sm:py-5 flex flex-col gap-3">
            <span className="font-semibold text-[15px]">Username Type</span>
            <div className="flex bg-fill-tertiary p-1 rounded-[14px] overflow-hidden">
              <button
                onClick={() => setType("word")}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all duration-200 ${
                  type === "word"
                    ? "bg-elevated-bg text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Random Word
              </button>
              <button
                onClick={() => setType("string")}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all duration-200 ${
                  type === "string"
                    ? "bg-elevated-bg text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Random String
              </button>
            </div>
          </div>

          <div className="h-px bg-separator ml-4" />

          {type === "word" ? (
            <>
              {/* Capitalize Row */}
              <div className="settings-control-row sm:px-5">
                <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg font-mono text-xs font-bold">Aa</span>
                <span>
                  <strong>Capitalize</strong>
                  <small>Use Title Case format</small>
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
                <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg font-mono text-xs font-bold">#</span>
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
            </>
          ) : (
            <>
              {/* Length Slider Row */}
              <div className="p-4 sm:px-5 sm:py-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[15px]">Length</span>
                  <span className="text-[15px] text-muted-foreground font-mono">{length}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="64"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-fill-tertiary rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md cursor-pointer"
                />
              </div>

              <div className="h-px bg-separator ml-4" />

              {/* Uppercase Row */}
              <div className="settings-control-row sm:px-5">
                <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg font-mono text-xs font-bold">A</span>
                <span>
                  <strong>Uppercase</strong>
                  <small>Include A-Z characters</small>
                </span>
                <button
                  className={`settings-toggle ${options.uppercase ? 'is-on' : ''}`}
                  onClick={() => toggleOption('uppercase')}
                >
                  <span />
                </button>
              </div>

              <div className="h-px bg-separator ml-14" />

              {/* Lowercase Row */}
              <div className="settings-control-row sm:px-5">
                <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg font-mono text-xs font-bold">a</span>
                <span>
                  <strong>Lowercase</strong>
                  <small>Include a-z characters</small>
                </span>
                <button
                  className={`settings-toggle ${options.lowercase ? 'is-on' : ''}`}
                  onClick={() => toggleOption('lowercase')}
                >
                  <span />
                </button>
              </div>

              <div className="h-px bg-separator ml-14" />

              {/* Numbers Row */}
              <div className="settings-control-row sm:px-5">
                <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg font-mono text-xs font-bold">1</span>
                <span>
                  <strong>Numbers</strong>
                  <small>Include 0-9 characters</small>
                </span>
                <button
                  className={`settings-toggle ${options.numbers ? 'is-on' : ''}`}
                  onClick={() => toggleOption('numbers')}
                >
                  <span />
                </button>
              </div>

              <div className="h-px bg-separator ml-14" />

              {/* Special Row */}
              <div className="settings-control-row sm:px-5">
                <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-8 h-8 rounded-lg font-mono text-xs font-bold">!</span>
                <span>
                  <strong>Special</strong>
                  <small>Include !@#$%^&*</small>
                </span>
                <button
                  className={`settings-toggle ${options.special ? 'is-on' : ''}`}
                  onClick={() => toggleOption('special')}
                >
                  <span />
                </button>
              </div>
            </>
          )}

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
            Copy Username
          </>
        )}
      </Button>

    </div>
  );
}
