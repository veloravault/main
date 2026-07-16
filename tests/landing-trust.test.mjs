import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("landing tells one private-beta access story and explains the invitation flow", () => {
  const pricing = read("src/components/dreelio/Pricing.tsx");
  const hero = read("src/components/dreelio/Hero.tsx");
  const finalCta = read("src/components/dreelio/FinalCTA.tsx");
  const gateway = read("src/components/auth/AuthGateway.tsx");
  const requestForm = read("src/components/access/RequestAccessForm.tsx");
  const data = read("src/components/dreelio/data.ts");
  const combined = [pricing, hero, finalCta, gateway, requestForm, data].join("\n");

  assert.match(pricing, /Free during private beta/);
  for (const step of [
    "Send your request",
    "We review it",
    "Receive an invitation",
    "Create private access",
  ]) {
    assert.match(data, new RegExp(step));
  }
  assert.match(combined, /manually reviewed/i);
  assert.match(combined, /invitation email/i);
  assert.match(requestForm, /Request received/);
  assert.doesNotMatch(combined, /Free for everyone,\s*always/i);
  assert.doesNotMatch(combined, /Try Velora Vault free/i);
});

test("landing removes unfinished editorial content and unsupported availability claims", () => {
  const page = read("src/app/page.tsx");
  const data = read("src/components/dreelio/data.ts");
  const nav = read("src/components/dreelio/Nav.tsx");
  const footer = read("src/components/dreelio/Footer.tsx");
  const combined = [page, data, nav, footer].join("\n");

  assert.doesNotMatch(page, /<Blog\s*\/>/);
  assert.doesNotMatch(combined, /href=["']#["']/);
  assert.doesNotMatch(combined, /FEATURED_POST|BLOG_POSTS/);
  assert.doesNotMatch(combined, /iOS\s*&\s*Android app/i);
  assert.doesNotMatch(combined, /updates instantly/i);
  assert.doesNotMatch(combined, /nothing's ever out of date/i);
});

test("security architecture and public explainer match the implemented boundaries", () => {
  const architecturePath = "src/components/dreelio/SecurityArchitecture.tsx";
  const securityPath = "src/app/security/page.tsx";
  const sealPath = "src/components/dreelio/VaultSeal.tsx";

  assert.equal(exists(architecturePath), true, "missing landing security architecture");
  assert.equal(exists(securityPath), true, "missing public security explainer");
  assert.equal(exists(sealPath), true, "missing Velora sealed-aperture signature");

  const architecture = read(architecturePath);
  const security = read(securityPath);
  const seal = read(sealPath);
  const combined = `${architecture}\n${security}`;

  for (const claim of [
    "AES-256-GCM",
    "PBKDF2-SHA-256",
    "600,000",
    "16-byte salt",
    "12-byte IV",
    "active membership",
  ]) {
    assert.match(combined, new RegExp(claim));
  }

  assert.match(security, /cannot recover/i);
  assert.match(security, /account password/i);
  assert.match(security, /unlocked device/i);
  assert.match(security, /browser extension/i);
  assert.match(security, /offline guessing/i);
  assert.match(security, /AI-assisted import/i);
  assert.match(security, /before.*encrypted and saved/is);
  assert.match(seal, /useReducedMotion/);
  assert.match(seal, /aria-hidden="true"/);
});
