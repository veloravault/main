import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("utility pages stay server-rendered metadata boundaries", () => {
  for (const route of [
    "password-generator",
    "passphrase-generator",
    "username-generator",
    "password-strength",
  ]) {
    const source = read(`src/app/utilities/${route}/page.tsx`);
    assert.doesNotMatch(source, /^"use client"/);
    assert.match(source, /export const metadata: Metadata = pageMetadata/);
    assert.match(source, /<PublicPageShell>/);
    assert.match(source, new RegExp(`path: ["']/utilities/${route}["']`));
  }
});

test("utility clients contain no network or persistence path for secrets", () => {
  const clientPaths = [
    "src/app/utilities/password-generator/PasswordGeneratorClient.tsx",
    "src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx",
    "src/app/utilities/username-generator/UsernameGeneratorClient.tsx",
    "src/app/utilities/password-strength/PasswordStrengthClient.tsx",
  ];
  const sources = clientPaths.map(read).join("\n");

  assert.doesNotMatch(
    sources,
    /fetch\(|axios|server action|localStorage|sessionStorage|document\.cookie|URLSearchParams|console\./i,
  );
});

test("utility metadata delegates the site-name suffix to the root template", () => {
  for (const route of [
    "password-generator",
    "passphrase-generator",
    "username-generator",
    "password-strength",
  ]) {
    const source = read(`src/app/utilities/${route}/page.tsx`);
    assert.doesNotMatch(source, /title: ["'][^"']*— Velora Vault["']/);
  }
});

test("shared workbench primitives expose accessible control semantics", () => {
  const source = read("src/app/utilities/UtilityWorkbench.tsx");
  assert.match(source, /type="range"/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /role="switch"/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Local only/);
});

test("clipboard feedback never logs or persists utility values", () => {
  const source = read("src/app/utilities/useUtilityClipboard.ts");
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(source, /console\.|localStorage|sessionStorage|fetch\(|URLSearchParams/);
});

test("related utility links exclude the current route", async () => {
  const { relatedUtilities } = await import("../src/app/utilities/utilityData.ts");
  const links = relatedUtilities("password-generator");
  assert.equal(links.length, 3);
  assert.equal(links.some((link) => link.slug === "password-generator"), false);
});

test("utility styles define responsive, focus, overflow, and reduced-motion safeguards", () => {
  const css = read("src/app/utilities/utilities.module.css");
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /min-height:\s*44px/);
  assert.doesNotMatch(css, /\.hero[\s\S]{0,300}min-height:\s*650px/);

  for (const className of [
    "workbenchBody",
    "controlsPanel",
    "strengthMeter",
    "analysisPanel",
    "passwordField",
    "feedbackPanel",
    "exampleStack",
    "bestPracticeList",
  ]) {
    assert.match(css, new RegExp(`\\.${className}\\b`));
  }
});

test("utility page establishes the Geist Sans content role", () => {
  const css = read("src/app/utilities/utilities.module.css");
  assert.match(
    css,
    /\.page\s*\{[^}]*font-family:\s*var\(--font-geist-sans\),\s*sans-serif;/,
  );
});

test("password and passphrase clients use shared local-only primitives", () => {
  for (const path of [
    "src/app/utilities/password-generator/PasswordGeneratorClient.tsx",
    "src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /UtilityPageLayout/);
    assert.match(source, /UtilityWorkbench/);
    assert.match(source, /useUtilityClipboard/);
    assert.match(source, /secureRandomInt/);
    assert.doesNotMatch(
      source,
      /console\.|fetch\(|localStorage|sessionStorage|Math\.random/,
    );
  }
});

test("generator clients defer randomness and expose their required controls", () => {
  const password = read(
    "src/app/utilities/password-generator/PasswordGeneratorClient.tsx",
  );
  const passphrase = read(
    "src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx",
  );

  for (const source of [password, passphrase]) {
    assert.match(source, /useState\(""\)/);
    assert.match(source, /useCallback/);
    assert.match(source, /useEffect/);
    assert.match(source, /queueMicrotask/);
  }

  assert.match(password, /<UtilityRange[\s\S]*?min=\{5\}[\s\S]*?max=\{128\}/);
  assert.match(password, /<UtilitySwitch/);
  assert.match(password, /aria-live="polite"/);
  assert.match(password, /styles\.strengthMeter/);

  assert.match(passphrase, /<UtilityRange[\s\S]*?min=\{3\}[\s\S]*?max=\{20\}/);
  assert.match(passphrase, /<UtilitySegments/);
  assert.match(passphrase, /overflow-wrap|overflowWrap|UtilityOutput/);
});

test("passphrase formatting preserves the current random words and suffix", () => {
  const source = read(
    "src/app/utilities/passphrase-generator/PassphraseGeneratorClient.tsx",
  );

  assert.match(source, /const \[selectedWords, setSelectedWords\] = useState/);
  assert.match(source, /const \[numberSuffix, setNumberSuffix\] = useState/);

  const selection = source.match(
    /const selectRandomParts = useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[([^\]]*)\]\);/,
  );
  assert.ok(selection, "random-part selection has a dedicated callback");
  assert.match(selection[1], /secureRandomItem\(ALL_WORDS\)/);
  assert.match(selection[1], /setSelectedWords/);
  assert.match(selection[1], /setNumberSuffix\(secureRandomInt\(10\)\)/);
  assert.equal(selection[2].trim(), "wordCount");
  assert.doesNotMatch(
    selection[2],
    /separator|capitalize|includeNumber/,
  );
  assert.match(source, /formatPassphrase\([\s\S]*selectedWords/);
  assert.match(source, /\(\) => numberSuffix/);
});

test("username and strength clients preserve mode, privacy, and local analysis contracts", () => {
  const username = read(
    "src/app/utilities/username-generator/UsernameGeneratorClient.tsx",
  );
  const strength = read(
    "src/app/utilities/password-strength/PasswordStrengthClient.tsx",
  );

  assert.match(username, /"words"\s*\|\s*"string"/);
  assert.match(username, /UtilitySegments/);
  assert.match(username, /useUtilityClipboard/);
  assert.match(strength, /zxcvbn\(password\)/);
  assert.match(strength, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(strength, /aria-live="polite"/);
  assert.doesNotMatch(
    `${username}\n${strength}`,
    /console\.|fetch\(|localStorage|sessionStorage|Math\.random/,
  );
});

test("username modes defer randomness and preserve readable identity while formatting", () => {
  const source = read(
    "src/app/utilities/username-generator/UsernameGeneratorClient.tsx",
  );

  assert.match(source, /const \[mode, setMode\] = useState<"words" \| "string">\("words"\)/);
  assert.match(source, /const \[wordCount, setWordCount\] = useState\(2\)/);
  assert.match(source, /const \[wordSeparator, setWordSeparator\] = useState<"" \| "-" \| "\." \| "_">\(""\)/);
  assert.match(source, /const \[length, setLength\] = useState\(12\)/);
  assert.match(source, /const \[selectedWords, setSelectedWords\] = useState/);
  assert.match(source, /const \[numberSuffix, setNumberSuffix\] = useState/);
  assert.match(source, /buildRandomString\(length, options, secureRandomInt\)/);
  assert.match(source, /formatWordUsername\([\s\S]*selectedWords/);
  assert.match(source, /\(\) => numberSuffix/);
  assert.match(source, /queueMicrotask/);
  assert.doesNotMatch(source, /uniqueNamesGenerator/);
});

test("strength analysis is labeled, masked, stable, and announces only its score", () => {
  const source = read(
    "src/app/utilities/password-strength/PasswordStrengthClient.tsx",
  );

  assert.match(
    source,
    /const SCORE_LABELS = \["Very weak", "Weak", "Fair", "Good", "Strong"\] as const/,
  );
  assert.match(
    source,
    /const result = useMemo\(\(\) => password \? zxcvbn\(password\) : null, \[password\]\)/,
  );
  assert.match(source, /htmlFor="password-strength-input"/);
  assert.match(source, /id="password-strength-input"/);
  assert.match(source, /styles\.analysisPanel/);
  assert.match(source, /styles\.strengthMeter/);
  assert.match(source, /data-score=\{result\?\.score \?\? 0\}/);

  const liveRegion = source.match(/<p className=\{styles\.srStatus\} aria-live="polite">([\s\S]*?)<\/p>/);
  assert.ok(liveRegion, "score changes use the shared visually-hidden live region");
  assert.match(liveRegion[1], /scoreLabel/);
  assert.doesNotMatch(liveRegion[1], /password/);
});
