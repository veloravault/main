import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const relativeLuminance = (hex) => {
  const channels = hex
    .match(/[a-f\d]{2}/gi)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrastRatio = (foreground, background) => {
  const values = [relativeLuminance(foreground), relativeLuminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
};

test("landing uses the current Velora public composition", () => {
  const page = read("src/app/page.tsx");

  assert.match(page, /<Hero\s*\/>/);
  assert.match(page, /<SecurityArchitecture\s*\/>/);
  assert.match(page, /<Pricing\s*\/>/);
  assert.doesNotMatch(page, /<Testimonials\s*\/>|<Blog\s*\/>/);
  assert.doesNotMatch(page, /zero knowledge/i);
});

test("landing product media depicts Velora rather than imported Dreelio screenshots", () => {
  const files = [
    "src/app/page.tsx",
    "src/components/dreelio/Hero.tsx",
    "src/components/dreelio/Devices.tsx",
    "src/components/dreelio/FeatureSplit.tsx",
  ].map(read).join("\n");

  assert.doesNotMatch(files, /\/dreelio\/img\//);
  assert.doesNotMatch(files, /hero-dashboard|project-ui|budget-ui|mobile-app\.png|devices\.png/);
  assert.match(files, /VeloraProductPreview/);
});

test("landing palette keeps body text and actions accessible", () => {
  const css = read("src/app/dreelio/dreelio.module.css");

  assert.match(css, /--ink: #1d1d1f/);
  assert.match(css, /--ink-body: #424245/);
  assert.match(css, /--surface: #ffffff/);
  assert.match(css, /--accent: #0071e3/);
  assert.match(css, /\.btnDark\s*\{[^}]*background: var\(--accent\);[^}]*color: #fff;/s);

  assert.ok(contrastRatio("#424245", "#ffffff") >= 4.5);
  assert.ok(contrastRatio("#ffffff", "#0071e3") >= 4.5);
});

test("security architecture is semantic, static, and reduced-motion safe", () => {
  const architecture = read("src/components/dreelio/SecurityArchitecture.tsx");
  const seal = read("src/components/dreelio/VaultSeal.tsx");
  const sealCss = read("src/components/dreelio/VaultSeal.module.css");

  assert.match(architecture, /id="security"/);
  assert.match(architecture, /SECURITY_PRINCIPLES\.map/);
  assert.doesNotMatch(architecture, /marquee|TESTIMONIALS/);
  assert.match(seal, /aria-hidden="true"/);
  assert.match(seal, /useReducedMotion/);
  assert.match(seal, /<VeloraBrandMark/);
  assert.doesNotMatch(seal, /styles\.(glass|loop|core)/);
  assert.doesNotMatch(sealCss, /\.(glass|loop|core)\s*\{/);
  assert.match(sealCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test("fixed landing navigation leaves anchored section headings visible", () => {
  const css = read("src/app/dreelio/dreelio.module.css");

  for (const anchor of ["features", "benefits", "security", "pricing", "contact"]) {
    assert.match(css, new RegExp(`:global\\(#${anchor}\\)`));
  }
  assert.match(css, /scroll-margin-top: 112px/);
});
