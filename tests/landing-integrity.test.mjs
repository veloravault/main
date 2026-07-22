import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

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

test("landing product media depicts Velora rather than leftover template screenshots", () => {
  const files = [
    "src/app/page.tsx",
    "src/components/velora/Hero.tsx",
    "src/components/velora/Devices.tsx",
    "src/components/velora/FeatureSplit.tsx",
  ].map(read).join("\n");

  assert.doesNotMatch(files, /\/velora\/img\//);
  assert.doesNotMatch(files, /hero-dashboard|project-ui|budget-ui|mobile-app\.png|devices\.png/);
  assert.match(files, /VeloraProductPreview/);
});

test("every product story uses a matching deterministic vault preview", () => {
  const page = read("src/app/page.tsx");
  const split = read("src/components/velora/FeatureSplit.tsx");
  const preview = read("src/components/velora/VeloraProductPreview.tsx");

  assert.match(page, /eyebrow="Password vault"[\s\S]*?preview="passwords"/);
  assert.match(page, /eyebrow="Document vault"[\s\S]*?preview="documents"/);
  assert.match(page, /eyebrow="Wallet & bank vault"[\s\S]*?preview="wallet"/);
  assert.match(split, /"passwords" \| "documents" \| "wallet"/);
  assert.match(preview, /"overview" \| "passwords" \| "documents" \| "wallet" \| "mobile"/);
  assert.match(preview, /function Documents\(\)/);
  assert.doesNotMatch(preview, /https?:\/\//);
});

test("hero walkthrough is poster-first and respects motion and data preferences", () => {
  const mediaPath = "src/components/velora/HeroVaultMedia.tsx";
  assert.equal(exists(mediaPath), true, "missing resilient hero media component");

  const hero = read("src/components/velora/Hero.tsx");
  const media = read(mediaPath);
  assert.match(hero, /import \{ HeroVaultMedia \}/);
  assert.match(hero, /<HeroVaultMedia\s*\/>/);
  assert.doesNotMatch(hero, /VaultSeal/);
  assert.match(media, /autoPlay/);
  assert.match(media, /muted/);
  assert.match(media, /loop/);
  assert.match(media, /playsInline/);
  assert.match(media, /prefers-reduced-motion:\s*reduce/);
  assert.match(media, /saveData/);
  assert.match(media, /onError/);
  assert.match(media, /velora-vault-walkthrough\.mp4/);
  assert.match(media, /velora-vault-walkthrough-poster\.png/);
});

test("landing palette keeps body text and actions accessible", () => {
  const css = read("src/app/velora/velora.module.css");

  assert.match(css, /--ink: #1d1d1f/);
  assert.match(css, /--ink-body: #424245/);
  assert.match(css, /--surface: #ffffff/);
  assert.match(css, /--accent: #0071e3/);
  assert.match(css, /\.btnDark\s*\{[^}]*background: var\(--accent\);[^}]*color: #fff;/s);

  assert.ok(contrastRatio("#424245", "#ffffff") >= 4.5);
  assert.ok(contrastRatio("#ffffff", "#0071e3") >= 4.5);
});

test("security architecture is semantic, static, and reduced-motion safe", () => {
  const architecture = read("src/components/velora/SecurityArchitecture.tsx");
  const seal = read("src/components/velora/VaultSeal.tsx");
  const sealCss = read("src/components/velora/VaultSeal.module.css");

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
  const css = read("src/app/velora/velora.module.css");

  for (const anchor of ["features", "benefits", "security", "pricing", "contact"]) {
    assert.match(css, new RegExp(`:global\\(#${anchor}\\)`));
  }
  assert.match(css, /scroll-margin-top: 112px/);
});
