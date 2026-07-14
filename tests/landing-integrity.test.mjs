import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("landing tells the approved Private Keynote story", () => {
  const page = read("src/app/page.tsx");
  const aperture = read("src/components/marketing/VaultAperture.tsx");

  for (const copy of [
    "Private by invitation",
    "Everything important",
    "Only yours",
    "Request access",
    "Already invited? Sign in",
  ]) {
    const escapedCopy = copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(page, new RegExp(escapedCopy));
  }

  assert.doesNotMatch(page, /zero knowledge/i);
  assert.match(aperture, /useReducedMotion/);
  assert.match(aperture, /x: "-50%"/);
  assert.match(aperture, /y: "-50%"/);
  assert.match(
    read("src/app/landing.module.css"),
    /@media \(prefers-reduced-motion: reduce\)/,
  );
});
