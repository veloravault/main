import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("import preview uses real service logo assets", () => {
  const features = read("src/components/dreelio/Features.tsx");

  assert.match(features, /assets\.nflxext\.com\/.*nficon2016\.png/);
  assert.match(features, /Spotify_Primary_Logo_RGB_Green\.png/);
  assert.match(features, /amazon\.com\/favicon\.ico/);
  assert.doesNotMatch(features, /function (?:Netflix|Spotify|Amazon)Logo/);
});
