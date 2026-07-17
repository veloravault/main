import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("landing tells one open-signup story with no private-beta framing", () => {
  const pricing = read("src/components/dreelio/Pricing.tsx");
  const hero = read("src/components/dreelio/Hero.tsx");
  const finalCta = read("src/components/dreelio/FinalCTA.tsx");
  const gateway = read("src/components/auth/AuthGateway.tsx");
  const signUpForm = read("src/components/auth/SignUpForm.tsx");
  const data = read("src/components/dreelio/data.ts");
  const combined = [pricing, hero, finalCta, gateway, signUpForm, data].join("\n");

  assert.doesNotMatch(combined, /private beta/i);
  assert.doesNotMatch(combined, /manually reviewed/i);
  assert.doesNotMatch(combined, /invitation email/i);
  assert.doesNotMatch(combined, /request access/i);
  assert.doesNotMatch(combined, /BETA_STEPS/);
  assert.match(combined, /sign up/i);
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
  const securityContentPath = "src/components/dreelio/SecurityPageContent.tsx";
  const sealPath = "src/components/dreelio/VaultSeal.tsx";

  assert.equal(exists(architecturePath), true, "missing landing security architecture");
  assert.equal(exists(securityPath), true, "missing public security explainer");
  assert.equal(exists(securityContentPath), true, "missing public security content");
  assert.equal(exists(sealPath), true, "missing Velora sealed-aperture signature");

  const architecture = read(architecturePath);
  const security = read(securityPath);
  const securityContent = read(securityContentPath);
  const seal = read(sealPath);
  const combined = `${architecture}\n${security}\n${securityContent}`;

  for (const claim of [
    "AES-256-GCM",
    "PBKDF2-SHA-256",
    "600,000",
    "16-byte salt",
    "12-byte IV",
    "active membership",
  ]) {
    assert.match(combined, new RegExp(claim));
    assert.match(securityContent, new RegExp(claim));
  }

  assert.match(securityContent, /cannot recover/i);
  assert.match(securityContent, /account password/i);
  assert.match(securityContent, /unlocked device/i);
  assert.match(securityContent, /browser extension/i);
  assert.match(securityContent, /offline guessing/i);
  assert.match(securityContent, /AI-assisted import/i);
  assert.match(securityContent, /before.*encrypted and saved/is);
  assert.match(seal, /useReducedMotion/);
  assert.match(seal, /aria-hidden="true"/);
});

test("security explainer uses the public shell and an accessible motion story", () => {
  const page = read("src/app/security/page.tsx");
  const shell = read("src/components/dreelio/PublicPageShell.tsx");
  const navigation = read("src/components/dreelio/data.ts");
  const contentPath = "src/components/dreelio/SecurityPageContent.tsx";
  const visualsPath = "src/components/dreelio/SecurityVisuals.tsx";

  assert.equal(exists(contentPath), true, "missing security story client boundary");
  assert.equal(exists(visualsPath), true, "missing security visual explanations");

  const content = read(contentPath);
  const visuals = read(visualsPath);

  assert.match(page, /import \{ PublicPageShell \}/);
  assert.match(page, /import \{ SecurityPageContent \}/);
  assert.match(page, /<PublicPageShell>/);
  assert.match(page, /<SecurityPageContent\s*\/>/);
  assert.match(shell, /<Nav\s*\/>/);
  assert.match(shell, /<Footer\s*\/>/);
  assert.doesNotMatch(page, /LegalHeader/);
  assert.match(navigation, /href: "\/#features"/);
  assert.match(navigation, /href: "\/#benefits"/);
  assert.match(navigation, /href: "\/pricing"/);

  assert.match(visuals, /export function SecurityFlowVisual/);
  assert.match(visuals, /export function SecurityHeroVisual/);
  assert.match(visuals, /export function RecoveryVisual/);
  assert.match(visuals, /aria-hidden="true"/);
  assert.match(visuals, /useReducedMotion/);
  assert.match(visuals, /from "\.\/motion"/);
  assert.match(visuals, /whileInView=\{reduceMotion \? undefined : "show"\}/);
  assert.doesNotMatch(visuals, /does not keep a server copy/i);
  assert.match(content, /useReducedMotion/);
  assert.match(content, /LANDING_VIEWPORT/);
  assert.match(content, /<SecurityHeroVisual\s*\/>/);
  assert.match(content, /cannot recover/i);
  assert.match(content, /offline guessing/i);
  assert.match(content, /manual entry/i);
});

test("every public page uses the shared Velora header and footer shell", () => {
  const shellPath = "src/components/dreelio/PublicPageShell.tsx";
  assert.equal(exists(shellPath), true, "missing shared public page shell");

  const shell = read(shellPath);
  assert.match(shell, /import \{ Nav \}/);
  assert.match(shell, /import \{ Footer \}/);
  assert.match(shell, /<Nav\s*\/>/);
  assert.match(shell, /<Footer\s*\/>/);

  for (const route of [
    "src/app/page.tsx",
    "src/app/security/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx",
    "src/app/contact/page.tsx",
    "src/app/pricing/page.tsx",
    "src/app/confirm-signup/page.tsx",
    "src/app/reset-password/page.tsx",
    "src/app/onboarding/page.tsx",
    "src/app/blog/page.tsx",
    "src/app/blog/[slug]/page.tsx",
  ]) {
    const page = read(route);
    assert.match(page, /import \{ PublicPageShell \}/, `${route} must import PublicPageShell`);
    assert.match(page, /<PublicPageShell>/, `${route} must render PublicPageShell`);
    assert.doesNotMatch(page, /LegalHeader/, `${route} must not use the legacy legal header`);
  }

  for (const productRoute of ["src/app/vault/page.tsx", "src/app/admin/page.tsx"]) {
    assert.doesNotMatch(
      read(productRoute),
      /PublicPageShell/,
      `${productRoute} must retain its dedicated product shell`,
    );
  }

  const authShell = read("src/components/auth/AuthShell.tsx");
  assert.doesNotMatch(authShell, /themeToggle|useTheme|MoonIcon|SunIcon/);
});

test("policy content clears the fixed public navigation at every breakpoint", () => {
  const legalCss = read("src/components/legal/Legal.module.css");

  assert.match(legalCss, /\.article\s*\{[^}]*padding-block:\s*132px 120px/s);
  assert.match(
    legalCss,
    /@media \(max-width: 600px\)[\s\S]*?\.article\s*\{[^}]*padding-block:\s*112px 80px/s,
  );
});
