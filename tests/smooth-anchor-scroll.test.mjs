import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("SmoothAnchorScroll is mounted once, site-wide, in the public shell", () => {
  const shell = read("src/components/velora/PublicPageShell.tsx");
  assert.match(shell, /import \{ SmoothAnchorScroll \}/);
  assert.match(shell, /<SmoothAnchorScroll \/>/);
});

test("scroll-behavior: smooth is enabled globally with a reduced-motion fallback", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /^html \{\s*scroll-behavior:\s*smooth;\s*\}/m);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{\s*html \{\s*scroll-behavior:\s*auto;/);
});

test("smooth anchor scroll uses tween easing, not spring, and reads each target's own scroll-margin-top", () => {
  const content = read("src/components/velora/SmoothAnchorScroll.tsx");

  assert.match(content, /"use client"/);
  assert.match(content, /from "framer-motion"/);

  // Regression guard: animate() defaults to spring physics for a bare value
  // animation unless told otherwise, and a spring asymptotically creeping to
  // settle reproduces the exact "fast start, endless crawl" bug this was
  // built to avoid.
  assert.match(content, /type:\s*"tween"/);

  // Regression guard: a plain scrollTo() call inherits the page's global
  // scroll-behavior:smooth. Since this file already interpolates smoothly
  // itself across frames, letting the browser also smooth each individual
  // per-frame call compounds into a crawl that never catches up - every
  // scrollTo() here must opt out with an explicit instant behavior.
  const scrollToCalls = [...content.matchAll(/window\.scrollTo\(\{[^}]*\}\)/g)];
  assert.ok(scrollToCalls.length >= 2, "expected at least two window.scrollTo calls");
  for (const [call] of scrollToCalls) {
    assert.match(call, /behavior:\s*"instant"/, `scrollTo call missing explicit instant behavior: ${call}`);
  }

  assert.match(content, /getComputedStyle\(target\)\.scrollMarginTop/);
  assert.match(content, /prefers-reduced-motion/);
  assert.doesNotMatch(content, /import\s*\{[^}]*APPLE_EASE/, "should not reuse the small-UI-transition easing for large-distance scroll");
  assert.doesNotMatch(content, /ease:\s*APPLE_EASE/, "should not reuse the small-UI-transition easing for large-distance scroll");
  assert.doesNotMatch(content, /—|&(?:mdash|#8212|#x2014);/, "contains an em dash");
});
