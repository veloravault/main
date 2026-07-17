import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("www host redirects to the canonical production domain", () => {
  const config = read("next.config.ts");
  assert.match(config, /async redirects\(\)/);
  assert.match(config, /type:\s*"host"/);
  assert.match(config, /value:\s*"www\.veloravault\.in"/);
  assert.match(config, /value:\s*"veloravault\.vercel\.app"/);
  assert.match(config, /destination:\s*"https:\/\/veloravault\.in\/:path\*"/);
  assert.match(config, /permanent:\s*true/);
});

test("privacy disclosures describe the providers actually used", () => {
  const privacy = read("src/app/privacy/page.tsx");
  for (const provider of ["Supabase", "Cloudflare R2", "Razorpay"]) {
    assert.match(privacy, new RegExp(provider));
  }
  assert.match(privacy, /transactional email/i);
  assert.match(privacy, /AI-assisted import/i);
  assert.doesNotMatch(privacy, /Supabase for authentication, database hosting, and\s+storage infrastructure/);
  assert.match(privacy, /Supabase Auth handles your sign-in password/i);
  assert.match(privacy, /Danger Zone/i);
  assert.doesNotMatch(privacy, /request deletion[^.]*by contacting/i);
});

test("metadata resolves production URLs from the canonical domain", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /metadataBase:\s*new URL\("https:\/\/veloravault\.in"\)/);
});

test("current project docs reflect open signup, R2, Razorpay, and two plans", () => {
  const context = read("docs/project-context-2026-07-15.md");
  const readme = read("README.md");
  const current = `${context}\n${readme}`;
  assert.match(current, /Cloudflare R2/);
  assert.match(current, /Razorpay/);
  assert.match(current, /Free and Plus|Free \/ Plus/);
  assert.match(context, /open signup/i);
  assert.doesNotMatch(context, /The project is invite-only|Admin approval is the gate|Product category: invite-only/);
});

test("public contact addresses use the production domain", () => {
  const sources = [
    "src/app/contact/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx",
    "src/components/settings/LegalSettings.tsx",
  ].map(read).join("\n");
  assert.match(sources, /@veloravault\.in/);
  assert.doesNotMatch(sources, /@velora\.vault|@veloravault\.com/);
});

test("user-facing recovery language consistently calls the local secret a master key", () => {
  const sources = [
    "src/components/settings/LegalSettings.tsx",
    "src/components/PinLock.tsx",
    "src/components/DocumentVault.tsx",
  ].map(read).join("\n");
  assert.match(sources, /master key/i);
  assert.doesNotMatch(sources, /Master Password|master password|Argon2/);
});
