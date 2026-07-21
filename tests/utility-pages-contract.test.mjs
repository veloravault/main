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
