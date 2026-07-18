import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("contact page renders the public contact form", () => {
  const page = read("src/app/contact/page.tsx");
  assert.match(page, /ContactForm/);
  assert.match(page, /Send us a message/);
  assert.doesNotMatch(page, /web form we don/);
});

test("contact form exposes every field and posts to the public endpoint", () => {
  const form = read("src/components/contact/ContactForm.tsx");
  for (const name of ["name", "email", "topic", "subject", "message", "company"]) {
    assert.match(form, new RegExp(`name=["']${name}["']`));
  }
  assert.match(form, /fetch\(["']\/api\/contact["']/);
  assert.match(form, /aria-live=["']polite["']/);
  assert.match(form, /CONTACT_RATE_LIMITED/);
});

test("contact layout has an explicit mobile breakpoint", () => {
  const styles = read("src/components/contact/Contact.module.css");
  assert.match(styles, /@media\s*\(max-width:\s*700px\)/);
  assert.match(styles, /grid-template-columns:\s*1fr/);
});
