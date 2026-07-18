import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("root layout publishes Google measurement and Search Console verification", () => {
  const layout = read("src/app/layout.tsx");

  assert.match(layout, /verification:\s*\{\s*google:\s*["']Ujcj8cwdFNvamMuqMoR_Bhhs2mUTxHctWA4Xhf6sr8k["']/);
  assert.match(layout, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-GKGJ4QD0E5/);
  assert.match(layout, /gtag\(["']config["'],\s*["']G-GKGJ4QD0E5["']\)/);
  assert.match(layout, /nonce=\{nonce\}/);
  assert.match(layout, /strategy=["']afterInteractive["']/);
});

test("analytics bootstrap stays limited to initialization and never names sensitive fields", () => {
  const layout = read("src/app/layout.tsx");
  const bootstrap = layout.match(/const googleTagBootstrap = `([\s\S]*?)`;/)?.[1] ?? "";

  assert.match(bootstrap, /gtag\('js', new Date\(\)\)/);
  assert.match(bootstrap, /gtag\('config', 'G-GKGJ4QD0E5'\)/);
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
