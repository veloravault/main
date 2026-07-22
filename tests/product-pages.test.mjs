import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

const ROUTES = [
  ["password-manager", "src/app/password-manager/page.tsx"],
  ["how-it-works", "src/app/how-it-works/page.tsx"],
  ["features/secure-documents", "src/app/features/secure-documents/page.tsx"],
  ["features/digital-wallet", "src/app/features/digital-wallet/page.tsx"],
  ["features/magic-import", "src/app/features/magic-import/page.tsx"],
  ["help", "src/app/help/page.tsx"],
];

test("six product and help routes use the public shell and unique metadata paths", () => {
  for (const [route, file] of ROUTES) {
    assert.equal(exists(file), true, `${file} should exist`);
    const source = read(file);
    assert.match(source, /PublicPageShell/);
    assert.match(source, /pageMetadata\(\{/);
    assert.match(source, new RegExp(`path:\\s*["']/${route.replaceAll("/", "\\/")}["']`));
  }
});

test("shared product pages expose a complete Bitwarden-inspired hierarchy with Velora content", () => {
  const content = read("src/components/velora/product-pages/ProductPageContent.tsx");
  const data = read("src/components/velora/product-pages/product-page-data.ts");
  const visual = read("src/components/velora/product-pages/ProductPageVisual.tsx");

  for (const landmark of [
    "hero",
    "audienceRail",
    "problemSection",
    "featureGrid",
    "workflowSection",
    "securitySection",
    "relatedGrid",
    "faqSection",
    "finalCta",
  ]) {
    assert.match(content, new RegExp(`styles\\.${landmark}`));
  }

  for (const id of ["password-manager", "how-it-works", "secure-documents", "digital-wallet", "magic-import"]) {
    assert.match(data, new RegExp(`["']${id}["']`));
  }

  assert.match(content, /<details/);
  assert.match(content, /Get started free/);
  assert.match(visual, /role="img"/);
  assert.match(visual, /aria-label/);
  assert.doesNotMatch([content, data, visual].join("\n"), /Bitwarden/i);
});

test("product page styles remain full width, responsive, accessible, and dark-mode aware", () => {
  const css = read("src/components/velora/product-pages/product-pages.module.css");

  assert.match(css, /\.page\s*\{[^}]*width:\s*100%;/s);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /:global\(\.dark\)/);
  assert.match(css, /@media \(max-width:\s*900px\)/);
  assert.match(css, /@media \(max-width:\s*600px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});

test("product audience rail uses contained cards without colored page gutters", () => {
  const content = read("src/components/velora/product-pages/ProductPageContent.tsx");
  const css = read("src/components/velora/product-pages/product-pages.module.css");

  assert.match(content, /className=\{styles\.audienceLabel\}/);
  assert.match(css, /\.audienceRail\s*\{[^}]*gap:\s*clamp\(/s);
  assert.match(css, /\.audienceRail\s*\{[^}]*background:\s*#fff\s*!important/s);
  assert.match(css, /:global\(\.dark\)\s+\.audienceRail\s*\{[^}]*background:\s*#000\s*!important/s);
  assert.match(css, /\.audienceRail article\s*\{[^}]*border:\s*1px solid var\(--line\)/s);
  assert.match(css, /\.audienceRail article\s*\{[^}]*border-radius:/s);
  assert.match(css, /\.problemSection\s*\{[^}]*padding-top:\s*clamp\(72px,\s*7vw,\s*112px\)/s);
});

test("help hub offers local filtering, topic navigation, and recovery guidance", () => {
  const page = read("src/app/help/page.tsx");
  const content = read("src/components/velora/help/HelpPageContent.tsx");
  const css = read("src/components/velora/help/help-page.module.css");

  assert.match(page, /HelpPageContent/);
  assert.match(content, /useState/);
  assert.match(content, /aria-label="Search help articles"/);
  assert.match(content, /aria-live="polite"/);
  assert.match(content, /Master key/);
  assert.match(content, /href="\/contact"/);
  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /:global\(\.dark\)/);
  assert.match(css, /:focus-visible/);
});

test("new public pages are discoverable through navigation, search, footer, and sitemap", () => {
  const data = read("src/components/velora/data.ts");
  const sitemap = read("src/app/sitemap.ts");

  assert.match(data, /label:\s*["']Password Manager["'],\s*href:\s*["']\/password-manager["']/);
  for (const [route] of ROUTES) {
    const href = `/${route}`;
    assert.match(data, new RegExp(`href:\\s*["']${href.replaceAll("/", "\\/")}["']`));
    assert.match(sitemap, new RegExp(`\\$\\{BASE_URL\\}${href.replaceAll("/", "\\/")}`));
  }
});

test("new public page copy contains no em dash characters or entities", () => {
  const files = [
    ...ROUTES.map(([, file]) => file),
    "src/components/velora/product-pages/ProductPageContent.tsx",
    "src/components/velora/product-pages/ProductPageVisual.tsx",
    "src/components/velora/product-pages/product-page-data.ts",
    "src/components/velora/help/HelpPageContent.tsx",
    "src/components/velora/data.ts",
  ];

  for (const file of files) {
    assert.doesNotMatch(read(file), /\u2014|&(?:mdash|#8212|#x2014);/, `${file} contains an em dash`);
  }
});
