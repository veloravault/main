import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("landing tells one open-account story with consistent free-start CTAs", () => {
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
  assert.match(combined, /Get started free/);
  assert.doesNotMatch(combined, />\s*Sign up(?: free)?\s*</i);
});

test("public account CTAs consistently say Get started free", () => {
  const sources = [
    "src/components/dreelio/Nav.tsx",
    "src/components/dreelio/Hero.tsx",
    "src/components/dreelio/Pricing.tsx",
    "src/components/dreelio/PricingPageContent.tsx",
    "src/components/dreelio/FinalCTA.tsx",
    "src/components/dreelio/SecurityPageContent.tsx",
    "src/components/dreelio/BlogListContent.tsx",
    "src/components/dreelio/BlogPostContent.tsx",
    "src/app/utilities/UtilityPageLayout.tsx",
    "src/components/auth/AuthGateway.tsx",
    "src/components/auth/SignUpForm.tsx",
  ].map(read).join("\n");

  assert.match(sources, /Get started free/);
  assert.doesNotMatch(sources, />\s*Sign up(?: free)?\s*</i);
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

test("public navigation exposes all utilities through responsive submenus", () => {
  const nav = read("src/components/dreelio/Nav.tsx");
  const data = read("src/components/dreelio/data.ts");
  const css = read("src/components/dreelio/Nav.module.css");

  assert.doesNotMatch(data, /label:\s*["']Benefits["']/);
  assert.match(data, /export const UTILITY_LINKS/);

  for (const [label, href] of [
    ["Password Generator", "/utilities/password-generator"],
    ["Passphrase Generator", "/utilities/passphrase-generator"],
    ["Username Generator", "/utilities/username-generator"],
    ["Password Strength Tester", "/utilities/password-strength"],
  ]) {
    assert.match(data, new RegExp(`label: ["']${label}["'][\\s\\S]*href: ["']${href}["']`));
  }

  assert.match(nav, /aria-haspopup="menu"/);
  assert.match(nav, /aria-controls="utilities-menu"/);
  assert.match(nav, /id="utilities-menu"/);
  assert.match(nav, /role="menu"/);
  assert.match(nav, /event\.key === "Escape"/);
  assert.match(nav, /pointerdown/);
  assert.match(nav, /aria-controls="mobile-utilities-menu"/);
  assert.match(nav, /id="mobile-utilities-menu"/);

  for (const className of [
    "utilityTrigger",
    "utilityDropdown",
    "mobileUtilityTrigger",
    "mobileUtilityLinks",
  ]) {
    assert.match(css, new RegExp(`\\.${className}\\b`));
  }
  assert.match(css, /@media \(max-width: 1024px\)/);
  assert.match(css, /:focus-visible/);
});

test("mobile navigation and homepage cards keep nested content inside the viewport", () => {
  const navCss = read("src/components/dreelio/Nav.module.css");
  const sharedCss = read("src/app/dreelio/dreelio.module.css");
  const featuresCss = read("src/components/dreelio/Features.module.css");
  const previewCss = read("src/components/dreelio/VeloraProductPreview.module.css");

  assert.match(navCss, /\.mobileMenu\s*>\s*a:not\(\[class\]\)/);
  assert.doesNotMatch(navCss, /\.mobileUtilityLinks a\s*\{[^}]*border-left:/s);
  assert.match(navCss, /\.mobileUtilityLinks\s*\{[^}]*border-radius:/s);

  assert.match(featuresCss, /\.bigCard\s*\{[^}]*min-width:\s*0;/s);
  assert.match(featuresCss, /@media \(max-width:\s*560px\)[\s\S]*\.bigCard\s*\{[^}]*padding:/s);

  assert.match(sharedCss, /@media \(max-width:\s*600px\)[\s\S]*--pad:\s*16px;/s);
  assert.match(sharedCss, /@media \(max-width:\s*600px\)[\s\S]*\.section\s*\{[^}]*padding-block:/s);

  assert.match(previewCss, /@media \(max-width:\s*520px\)/);
  assert.match(previewCss, /\.preview\[data-variant="passwords"\][\s\S]*\.sidebar/);
  assert.match(previewCss, /\.masterDetail\s*\{[^}]*grid-template-columns:\s*1fr;/s);
  assert.match(previewCss, /\.detailCard\s*\{[^}]*display:\s*none;/s);
});

test("homepage sections use pure white and black canvases without changing the footer", () => {
  const sharedCss = read("src/app/dreelio/dreelio.module.css");
  const featuresCss = read("src/components/dreelio/Features.module.css");
  const pricingCss = read("src/components/dreelio/Pricing.module.css");
  const footerCss = read("src/components/dreelio/Footer.module.css");

  assert.match(sharedCss, /\.page\s*>\s*section\s*\{[^}]*background:\s*#fff(?:fff)?;/s);
  assert.match(sharedCss, /:global\(\.dark\)\s+\.page\s*>\s*section\s*\{[^}]*background:\s*#000(?:000)?;/s);
  assert.doesNotMatch(featuresCss, /\.section\s*\{[^}]*background:\s*var\(--surface-alt\)/s);
  assert.doesNotMatch(pricingCss, /\.section\s*\{[^}]*background:\s*var\(--surface-alt\)/s);
  assert.match(footerCss, /#0b0b0d/i);
});

test("homepage includes the two password-manager education structures", () => {
  const page = read("src/app/page.tsx");
  for (const path of [
    "src/components/dreelio/WhyPasswordManager.tsx",
    "src/components/dreelio/PasswordManagerEssentials.tsx",
    "src/components/dreelio/WhyPasswordManager.module.css",
    "src/components/dreelio/PasswordManagerEssentials.module.css",
  ]) {
    assert.equal(exists(path), true, `missing ${path}`);
  }
  const why = read("src/components/dreelio/WhyPasswordManager.tsx");
  const essentials = read("src/components/dreelio/PasswordManagerEssentials.tsx");
  const whyCss = read("src/components/dreelio/WhyPasswordManager.module.css");
  const essentialsCss = read("src/components/dreelio/PasswordManagerEssentials.module.css");

  assert.match(page, /<WhyPasswordManager\s*\/>/);
  assert.match(page, /<PasswordManagerEssentials\s*\/>/);
  assert.ok(page.indexOf("<WhyPasswordManager") < page.indexOf("<FeatureSplit"));
  assert.match(why, /Why you need a password manager/);
  assert.match(why, /aria-expanded=\{openIndex === index\}/);
  assert.match(why, /Placeholder visual/);
  assert.match(essentials, /Everything you need in a password manager/);
  assert.match(essentials, /Placeholder image/);
  assert.match(whyCss, /@media \(max-width:\s*800px\)/);
  assert.match(essentialsCss, /@media \(max-width:\s*800px\)/);
});

test("public pages use the full viewport shell and the essentials grid has six cards", () => {
  for (const path of [
    "src/app/pricing/pricing.module.css",
    "src/app/security/security.module.css",
    "src/app/blog/blog.module.css",
    "src/app/blog/[slug]/blog-post.module.css",
    "src/app/utilities/utilities.module.css",
    "src/components/legal/Legal.module.css",
  ]) {
    const css = read(path);
    assert.match(css, /\.(?:page|article)\s*\{[^}]*width:\s*100%;/s, `${path} should span the viewport shell`);
    assert.doesNotMatch(css, /width:\s*min\([^}]*1120px/);
    assert.doesNotMatch(css, /max-width:\s*760px/);
  }

  const essentials = read("src/components/dreelio/PasswordManagerEssentials.tsx");
  assert.equal((essentials.match(/title:\s*"/g) ?? []).length, 6);
  assert.match(essentials, /FingerprintIcon/);
  assert.match(essentials, /SearchIcon/);
  assert.match(essentials, /ShieldCheckIcon/);
});

test("header search control has no filled circular background", () => {
  const css = read("src/components/dreelio/Nav.module.css");
  assert.match(css, /\.searchTrigger,\s*\n\.mobileSearchTrigger\s*\{[^}]*background:\s*transparent;/s);
});

test("public layout and header span the viewport with a functional site search", () => {
  const sharedCss = read("src/app/dreelio/dreelio.module.css");
  const nav = read("src/components/dreelio/Nav.tsx");
  const navCss = read("src/components/dreelio/Nav.module.css");
  const data = read("src/components/dreelio/data.ts");

  assert.match(sharedCss, /--maxw:\s*none;/);
  assert.match(navCss, /\.nav\s*\{[^}]*max-width:\s*none;/s);
  assert.match(nav, /SearchIcon/);
  assert.match(nav, /aria-label="Search Velora Vault"/);
  assert.match(nav, /role="dialog"/);
  assert.match(nav, /aria-modal="true"/);
  assert.match(nav, /<form[^>]*onSubmit=\{handleSearchSubmit\}/);
  assert.match(nav, /SEARCH_ITEMS\.filter/);
  assert.match(data, /export const SEARCH_ITEMS/);
  assert.match(navCss, /\.searchOverlay\s*\{/);
  assert.match(navCss, /@media \(max-width:\s*1024px\)/);
});

test("public footer closes the page with identity, navigation, and payment trust", () => {
  const footer = read("src/components/dreelio/Footer.tsx");
  const css = read("src/components/dreelio/Footer.module.css");

  assert.match(footer, /Encrypted before storage\. Yours to unlock\./);
  assert.match(footer, /aria-label=\{col\.heading\}/);
  assert.match(footer, /<PaymentBadges/);
  assert.match(footer, /Payments secured by Razorpay/);
  assert.match(footer, /href="\/privacy"/);
  assert.match(footer, /href="\/terms"/);
  assert.doesNotMatch(footer, /styles\.card|styles\.divider/);
  assert.match(css, /#0b0b0d/i);
  assert.match(css, /#f5f5f7/i);
  assert.match(css, /#a1a1a6/i);
  assert.match(css, /#2997ff/i);
  assert.match(css, /#30d158/i);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
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
  assert.match(shell, /<Nav[^>]*\/>/);
  assert.match(shell, /<Footer\s*\/>/);
  assert.doesNotMatch(page, /LegalHeader/);
  assert.match(navigation, /href: "\/password-manager"/);
  assert.match(navigation, /href: "\/security"/);
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

test("security explainer documents shipped device, access, and billing controls", () => {
  const content = read("src/components/dreelio/SecurityPageContent.tsx");

  for (const claim of [
    "Protection in practice",
    "bound to the authenticated account",
    "auto-lock",
    "clipboard",
    "Sign out other devices",
    "row-level security",
    "webhook signature",
    "idempotent",
    "stale subscription events",
  ]) {
    assert.match(content, new RegExp(claim, "i"));
  }

  assert.match(content, /private\s+document storage/i);
  assert.match(content, /id="implemented-controls"/);
  assert.match(content, /Billing integrity/);
  assert.match(content, /does not encrypt\s+vault data/i);
  assert.match(content, /cannot recover/i);
  assert.match(content, /offline guessing/i);
});

test("every public page uses the shared Velora header and footer shell", () => {
  const shellPath = "src/components/dreelio/PublicPageShell.tsx";
  assert.equal(exists(shellPath), true, "missing shared public page shell");

  const shell = read(shellPath);
  assert.match(shell, /import \{ Nav \}/);
  assert.match(shell, /import \{ Footer \}/);
  assert.match(shell, /<Nav[^>]*\/>/);
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
    "src/app/login/page.tsx",
    "src/app/signup/page.tsx",
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
