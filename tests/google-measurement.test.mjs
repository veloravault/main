import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("root layout publishes Search Console verification and mounts consent-gated analytics", () => {
  const layout = read("src/app/layout.tsx");

  // Must live in the `metadata` export (Next.js renders this as a real
  // <meta name="google-site-verification"> tag) — NOT inside the JSON-LD
  // blocks, which Google Search Console's verifier does not read at all.
  const metadataBlock = layout.match(/export const metadata: Metadata = (\{[\s\S]*?\n\};)/)?.[1] ?? "";
  assert.match(metadataBlock, /verification:\s*\{\s*google:\s*["']Ujcj8cwdFNvamMuqMoR_Bhhs2mUTxHctWA4Xhf6sr8k["']/);

  const jsonLd = layout.match(/const ORGANIZATION_JSON_LD = (\{[\s\S]*?\n\};)/)?.[1] ?? "";
  assert.doesNotMatch(jsonLd, /verification/);

  // The gtag scripts themselves live in Analytics.tsx, gated behind consent —
  // see the next test — layout just mounts that component with the CSP nonce.
  assert.match(layout, /<Analytics nonce=\{nonce\}/);
});

test("analytics only loads gtag after consent, and stays limited to initialization with no sensitive fields", () => {
  const analytics = read("src/components/Analytics.tsx");

  assert.match(analytics, /consent === ["']granted["']/);
  assert.match(analytics, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=\$\{GA_MEASUREMENT_ID\}/);
  assert.match(analytics, /nonce=\{nonce\}/);
  assert.match(analytics, /strategy=["']afterInteractive["']/);
  assert.match(analytics, /GA_MEASUREMENT_ID = ["']G-GKGJ4QD0E5["']/);

  const bootstrap = analytics.match(/const googleTagBootstrap = `([\s\S]*?)`;/)?.[1] ?? "";
  assert.match(bootstrap, /gtag\('js', new Date\(\)\)/);
  assert.match(bootstrap, /gtag\('config', '\$\{GA_MEASUREMENT_ID\}'\)/);
  assert.doesNotMatch(bootstrap, /password|master|vault|document|contact|message|email|payment/i);
});

test("CSP permits only the Google origins needed by gtag", () => {
  const proxy = read("src/proxy.ts");

  assert.match(proxy, /script-src[^\n]*https:\/\/www\.googletagmanager\.com/);
  assert.match(proxy, /connect-src[^\n]*https:\/\/www\.google-analytics\.com/);
  assert.match(proxy, /connect-src[^\n]*https:\/\/\*\.google-analytics\.com/);
});

test("contact sitemap date reflects the public form release", () => {
  const sitemap = read("src/app/sitemap.ts");
  assert.match(sitemap, /contact:\s*["']2026-07-18["']/);
});
