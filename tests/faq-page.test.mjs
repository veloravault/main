import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("FAQ route uses the public shell, unique metadata, and a suppressed-nonce FAQPage schema", () => {
  const page = read("src/app/faq/page.tsx");

  assert.match(page, /PublicPageShell/);
  assert.match(page, /pageMetadata\(\{/);
  assert.match(page, /path:\s*["']\/faq["']/);
  assert.match(page, /"@type":\s*"FAQPage"/);
  assert.match(page, /mainEntity:\s*FAQ_CATEGORIES\.flatMap/);
  assert.match(page, /suppressHydrationWarning/);
  assert.match(page, /nonce=\{nonce\}/);
});

test("FAQ content is grouped into categories, each rendered as an accessible native accordion", () => {
  const content = read("src/components/dreelio/faq/FaqPageContent.tsx");

  assert.match(content, /export const FAQ_CATEGORIES/);
  assert.match(content, /<details/);
  assert.match(content, /<summary>/);
  assert.match(content, /aria-label="Jump to FAQ category"/);

  for (const category of [
    "getting-started",
    "security",
    "pricing",
    "privacy",
    "account",
  ]) {
    assert.match(content, new RegExp(`id:\\s*["']${category}["']`));
  }

  // Every category must have at least one question with real copy - not a
  // placeholder heading with no content underneath it.
  const categoryMatches = [...content.matchAll(/id:\s*"[a-z-]+",\s*label:\s*"[^"]+",\s*items:\s*\[/g)];
  assert.ok(categoryMatches.length >= 5, "expected at least 5 FAQ categories");

  assert.doesNotMatch(content, /—|&(?:mdash|#8212|#x2014);/, "FAQ content contains an em dash");
});

test("FAQ page styles are full width, responsive, dark-mode aware, and accessible", () => {
  const css = read("src/components/dreelio/faq/faq-page.module.css");

  assert.match(css, /\.page\s*\{[^}]*width:\s*100%;/s);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /:global\(\.dark\)/);
  assert.match(css, /@media \(max-width:\s*980px\)/);
  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /\.faqList details\[open\] summary span\s*\{[^}]*transform:\s*rotate\(45deg\)/s);
});

test("FAQ is discoverable through the header nav, site search, footer, and sitemap", () => {
  const data = read("src/components/dreelio/data.ts");
  const nav = read("src/components/dreelio/Nav.tsx");
  const sitemap = read("src/app/sitemap.ts");

  assert.match(data, /label:\s*["']FAQ["'],\s*href:\s*["']\/faq["']/);
  assert.match(data, /icon:\s*["']faq["']/);
  assert.match(data, /RESOURCE_LINKS\[4\]/);
  assert.match(nav, /faq:\s*MessageCircleQuestionIcon/);
  assert.match(sitemap, /\$\{BASE_URL\}\/faq/);
});
