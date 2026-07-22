import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("landing tells one open-account story with consistent free-start CTAs", () => {
  const pricing = read("src/components/velora/Pricing.tsx");
  const hero = read("src/components/velora/Hero.tsx");
  const finalCta = read("src/components/velora/FinalCTA.tsx");
  const gateway = read("src/components/auth/AuthGateway.tsx");
  const signUpForm = read("src/components/auth/SignUpForm.tsx");
  const data = read("src/components/velora/data.ts");
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
    "src/components/velora/Nav.tsx",
    "src/components/velora/Hero.tsx",
    "src/components/velora/Pricing.tsx",
    "src/components/velora/PricingPageContent.tsx",
    "src/components/velora/FinalCTA.tsx",
    "src/components/velora/SecurityPageContent.tsx",
    "src/components/velora/BlogListContent.tsx",
    "src/components/velora/BlogPostContent.tsx",
    "src/app/utilities/UtilityPageLayout.tsx",
    "src/components/auth/AuthGateway.tsx",
    "src/components/auth/SignUpForm.tsx",
  ].map(read).join("\n");

  assert.match(sources, /Get started free/);
  assert.doesNotMatch(sources, />\s*Sign up(?: free)?\s*</i);
});

test("landing removes unfinished editorial content and unsupported availability claims", () => {
  const page = read("src/app/page.tsx");
  const data = read("src/components/velora/data.ts");
  const nav = read("src/components/velora/Nav.tsx");
  const footer = read("src/components/velora/Footer.tsx");
  const combined = [page, data, nav, footer].join("\n");

  assert.doesNotMatch(page, /<Blog\s*\/>/);
  assert.doesNotMatch(combined, /href=["']#["']/);
  assert.doesNotMatch(combined, /FEATURED_POST|BLOG_POSTS/);
  assert.doesNotMatch(combined, /iOS\s*&\s*Android app/i);
  assert.doesNotMatch(combined, /updates instantly/i);
  assert.doesNotMatch(combined, /nothing's ever out of date/i);
});

test("public navigation separates products, utilities, resources, and pricing", () => {
  const nav = read("src/components/velora/Nav.tsx");
  const data = read("src/components/velora/data.ts");
  const css = read("src/components/velora/Nav.module.css");

  assert.doesNotMatch(data, /label:\s*["']Benefits["']/);
  assert.match(data, /export const PRODUCT_LINKS/);
  assert.match(data, /export const UTILITY_LINKS/);
  assert.match(data, /export const RESOURCE_LINKS/);
  assert.match(data, /export const NAV_GROUPS/);
  assert.match(data, /export const PRIMARY_NAV_LINKS/);

  for (const [label, href] of [
    ["Password Manager", "/password-manager"],
    ["How it works", "/how-it-works"],
    ["Secure Documents", "/features/secure-documents"],
    ["Digital Wallet", "/features/digital-wallet"],
    ["Magic Import", "/features/magic-import"],
    ["Password Generator", "/utilities/password-generator"],
    ["Passphrase Generator", "/utilities/passphrase-generator"],
    ["Username Generator", "/utilities/username-generator"],
    ["Password Strength Tester", "/utilities/password-strength"],
    ["Security", "/security"],
    ["Help Center", "/help"],
    ["Blog", "/blog"],
    ["Contact", "/contact"],
    ["Pricing", "/pricing"],
  ]) {
    assert.match(data, new RegExp(`label: ["']${label}["'][\\s\\S]*href: ["']${href}["']`));
  }

  assert.match(data, /description:/);
  assert.match(nav, /NAV_GROUPS\.map/);
  assert.match(nav, /name="desktop-primary-navigation"/);
  assert.match(nav, /name="mobile-primary-navigation"/);
  assert.match(nav, /id=\{`desktop-\$\{group\.id\}-menu`\}/);
  assert.match(nav, /id=\{`mobile-\$\{group\.id\}-menu`\}/);
  assert.doesNotMatch(nav, /role="menu"/);
  assert.match(nav, /event\.key === "Escape"/);

  for (const className of [
    "navGroup",
    "navGroupTrigger",
    "dropdownPanel",
    "dropdownGrid",
    "dropdownLink",
    "mobileNavGroup",
    "mobileNavTrigger",
    "mobileSubmenu",
  ]) {
    assert.match(css, new RegExp(`\\.${className}\\b`));
  }
  assert.match(css, /@media \(max-width: 1024px\)/);
  assert.match(css, /:focus-visible/);
});

test("desktop navigation uses a full-width icon-led mega panel", () => {
  const nav = read("src/components/velora/Nav.tsx");
  const data = read("src/components/velora/data.ts");
  const css = read("src/components/velora/Nav.module.css");

  assert.match(data, /export const PRODUCT_NAV_SECTIONS/);
  assert.match(data, /export const UTILITY_NAV_SECTIONS/);
  assert.match(data, /export const RESOURCE_NAV_SECTIONS/);
  for (const heading of [
    "Password Manager",
    "Vault features",
    "Explore Velora",
    "Create credentials",
    "Check security",
    "Learn",
    "Trust and privacy",
    "Connect",
  ]) {
    assert.match(data, new RegExp(`heading: ["']${heading}["']`));
  }

  assert.match(nav, /group\.sections\.map/);
  assert.match(nav, /className=\{styles\.megaMenuSection\}/);
  assert.match(nav, /<h2>\{section\.heading\}<\/h2>/);
  assert.match(nav, /const Icon = NAV_ICONS\[link\.icon\]/);
  assert.match(nav, /className=\{styles\.desktopMenuIcon\}/);
  assert.match(nav, /ChevronRightIcon/);

  assert.match(css, /\.dropdownPanel\s*\{[^}]*position:\s*fixed;/s);
  assert.match(css, /\.dropdownPanel\s*\{[^}]*left:\s*var\(--pad\);/s);
  assert.match(css, /\.dropdownPanel\s*\{[^}]*right:\s*var\(--pad\);/s);
  assert.match(css, /\.dropdownPanel\s*\{[^}]*border-radius:\s*0\s+0\s+24px\s+24px;/s);
  assert.match(css, /\.dropdownGrid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(css, /\.dropdownLink\s*\{[^}]*grid-template-columns:\s*36px\s+minmax\(0,\s*1fr\)\s+16px;/s);
  assert.match(css, /\.desktopMenuIcon\s*\{/);
  assert.match(css, /\.links\s*>\s*li\s*>\s*a\s*\{/);
  assert.match(css, /\.megaMenuSection\s*\{/);
  assert.match(css, /\.megaMenuSection\[data-highlight="true"\]/);
  assert.match(css, /\.navGroup\[open\] \.navGroupTrigger/);
});

test("desktop and mobile navigation open without waiting for client hydration", () => {
  const nav = read("src/components/velora/Nav.tsx");
  const css = read("src/components/velora/Nav.module.css");

  assert.match(nav, /<details[^>]*className=\{styles\.navGroup\}/);
  assert.match(nav, /<summary className=\{styles\.navGroupTrigger\}>/);
  assert.match(nav, /<details className=\{styles\.mobileMenuDisclosure\}>/);
  assert.match(nav, /<summary className=\{styles\.burger\}/);
  assert.match(nav, /<details className=\{styles\.mobileNavGroup\}/);
  assert.match(nav, /<summary className=\{styles\.mobileNavTrigger\}>/);
  assert.doesNotMatch(nav, /useState<NavMenuId/);
  assert.doesNotMatch(nav, /setActiveDesktopMenu/);
  assert.doesNotMatch(nav, /setActiveMobileMenu/);

  assert.match(css, /\.navGroup\[open\] \.dropdownPanel/);
  assert.match(css, /\.navGroup\[open\] \.navGroupTrigger/);
  assert.match(css, /\.mobileMenuDisclosure\[open\] \.mobileMenu/);
  assert.match(css, /\.mobileNavGroup\[open\] \.mobileSubmenu/);
});

test("mobile navigation and homepage cards keep nested content inside the viewport", () => {
  const navCss = read("src/components/velora/Nav.module.css");
  const sharedCss = read("src/app/velora/velora.module.css");
  const featuresCss = read("src/components/velora/Features.module.css");
  const previewCss = read("src/components/velora/VeloraProductPreview.module.css");

  assert.match(navCss, /\.mobileMenu\s*>\s*a:not\(\[class\]\)/);
  assert.doesNotMatch(navCss, /\.mobileSubmenu a\s*\{[^}]*border-left:/s);
  assert.match(navCss, /\.mobileSubmenu\s*\{[^}]*border-radius:/s);

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
  const sharedCss = read("src/app/velora/velora.module.css");
  const featuresCss = read("src/components/velora/Features.module.css");
  const pricingCss = read("src/components/velora/Pricing.module.css");
  const footerCss = read("src/components/velora/Footer.module.css");

  assert.match(sharedCss, /\.page\s*>\s*section\s*\{[^}]*background:\s*#fff(?:fff)?;/s);
  assert.match(sharedCss, /:global\(\.dark\)\s+\.page\s*>\s*section\s*\{[^}]*background:\s*#000(?:000)?;/s);
  assert.doesNotMatch(featuresCss, /\.section\s*\{[^}]*background:\s*var\(--surface-alt\)/s);
  assert.doesNotMatch(pricingCss, /\.section\s*\{[^}]*background:\s*var\(--surface-alt\)/s);
  assert.match(footerCss, /#0b0b0d/i);
});

test("homepage includes the two password-manager education structures", () => {
  const page = read("src/app/page.tsx");
  for (const path of [
    "src/components/velora/WhyPasswordManager.tsx",
    "src/components/velora/PasswordManagerEssentials.tsx",
    "src/components/velora/WhyPasswordManager.module.css",
    "src/components/velora/PasswordManagerEssentials.module.css",
  ]) {
    assert.equal(exists(path), true, `missing ${path}`);
  }
  const why = read("src/components/velora/WhyPasswordManager.tsx");
  const essentials = read("src/components/velora/PasswordManagerEssentials.tsx");
  const whyCss = read("src/components/velora/WhyPasswordManager.module.css");
  const essentialsCss = read("src/components/velora/PasswordManagerEssentials.module.css");

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

  const essentials = read("src/components/velora/PasswordManagerEssentials.tsx");
  assert.equal((essentials.match(/title:\s*"/g) ?? []).length, 6);
  assert.match(essentials, /FingerprintIcon/);
  assert.match(essentials, /SearchIcon/);
  assert.match(essentials, /ShieldCheckIcon/);
});

test("header search control has no filled circular background", () => {
  const css = read("src/components/velora/Nav.module.css");
  assert.match(css, /\.searchTrigger,\s*\n\.mobileSearchTrigger\s*\{[^}]*background:\s*transparent;/s);
});

test("public layout and header span the viewport with a functional site search", () => {
  const sharedCss = read("src/app/velora/velora.module.css");
  const nav = read("src/components/velora/Nav.tsx");
  const navCss = read("src/components/velora/Nav.module.css");
  const data = read("src/components/velora/data.ts");

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
  const footer = read("src/components/velora/Footer.tsx");
  const css = read("src/components/velora/Footer.module.css");

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
  const architecturePath = "src/components/velora/SecurityArchitecture.tsx";
  const securityPath = "src/app/security/page.tsx";
  const securityContentPath = "src/components/velora/SecurityPageContent.tsx";
  const sealPath = "src/components/velora/VaultSeal.tsx";

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
  const shell = read("src/components/velora/PublicPageShell.tsx");
  const navigation = read("src/components/velora/data.ts");
  const contentPath = "src/components/velora/SecurityPageContent.tsx";
  const visualsPath = "src/components/velora/SecurityVisuals.tsx";

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
  const content = read("src/components/velora/SecurityPageContent.tsx");

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
  const shellPath = "src/components/velora/PublicPageShell.tsx";
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
