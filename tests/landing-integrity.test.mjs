import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const relativeLuminance = (hex) => {
  const channels = hex
    .match(/[a-f\d]{2}/gi)
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrastRatio = (foreground, background) => {
  const values = [relativeLuminance(foreground), relativeLuminance(background)];
  const lighter = Math.max(...values);
  const darker = Math.min(...values);
  return (lighter + 0.05) / (darker + 0.05);
};

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

test("landing palette keeps small labels and CTA hover text accessible", () => {
  const css = read("src/app/landing.module.css");

  assert.match(css, /--landing-blue: #0071e3/);
  assert.match(css, /--landing-label-blue: #0066cc/);
  assert.match(css, /--landing-label-blue: #2997ff/);
  assert.match(css, /--landing-action-hover: #005bb5/);
  assert.match(css, /color: var\(--landing-label-blue\)/);
  assert.match(css, /background: var\(--landing-action-hover\)/);

  assert.ok(contrastRatio("#0066cc", "#fbfbfd") >= 4.5);
  assert.ok(contrastRatio("#2997ff", "#101012") >= 4.5);
  assert.ok(contrastRatio("#2997ff", "#1d1d1f") >= 4.5);
  assert.ok(contrastRatio("#005bb5", "#ffffff") >= 4.5);
});

test("privacy panel keeps one accessible graphite material in both themes", () => {
  const css = read("src/app/landing.module.css");

  assert.match(
    css,
    /\.privacyNote \{[^}]*background: #1d1d1f;[^}]*color: #fbfbfd;/s,
  );
  assert.match(
    css,
    /\.privacyNote \.sectionEyebrow \{ color: #2997ff; \}/,
  );
  assert.match(css, /\.privacyNote p:last-child \{[^}]*color: #c7c7cc;/s);
  assert.match(css, /\.privacyGlyph \{[^}]*rgba\(251, 251, 253, 0\.2\)/s);

  assert.ok(contrastRatio("#fbfbfd", "#1d1d1f") >= 4.5);
  assert.ok(contrastRatio("#2997ff", "#1d1d1f") >= 4.5);
  assert.ok(contrastRatio("#c7c7cc", "#1d1d1f") >= 4.5);
});

test("landing anchors and decorative aperture keep semantic boundaries", () => {
  const css = read("src/app/landing.module.css");
  const aperture = read("src/components/marketing/VaultAperture.tsx");

  assert.match(
    css,
    /\.securitySection\s*\{[^}]*scroll-margin-top: 100px;/s,
  );
  assert.doesNotMatch(css, /#security/);
  assert.match(
    aperture,
    /className=\{styles\.apertureStage\}[\s\S]*?aria-hidden="true"/,
  );
});
