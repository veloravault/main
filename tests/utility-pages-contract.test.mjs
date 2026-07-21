import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

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
