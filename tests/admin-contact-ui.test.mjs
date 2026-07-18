import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("contact is a separate owner-console destination", () => {
  const types = read("src/components/admin/types.ts");
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  const sidebar = read("src/components/admin/AdminSidebar.tsx");
  assert.match(types, /AdminView[^\n]+"contact"/);
  assert.match(consoleSource, /<AdminContact/);
  assert.match(sidebar, /id:\s*"contact",\s*label:\s*"Contact"/);
  assert.match(sidebar, /description:\s*"Public messages"/);
});

test("contact inbox lists, opens, filters, and updates submissions", () => {
  const inbox = read("src/components/admin/AdminContact.tsx");
  for (const filter of ["new", "read", "resolved", "all"]) assert.match(inbox, new RegExp(`"${filter}"`));
  assert.match(inbox, /fetch\(`\/api\/admin\/contact\?/);
  assert.match(inbox, /AdminContactDetail/);
  assert.match(inbox, /nextCursor/);
});

test("contact detail supports owner status controls and email replies", () => {
  const detail = read("src/components/admin/AdminContactDetail.tsx");
  assert.match(detail, /\/api\/admin\/contact\/\$\{encodeURIComponent\(props\.submissionId\)\}/);
  assert.match(detail, /method:\s*"PATCH"/);
  assert.match(detail, /Mark new/);
  assert.match(detail, /Mark read/);
  assert.match(detail, /Resolve/);
  assert.match(detail, /Reply by email/);
  assert.match(detail, /mailto:/);
  assert.match(detail, /aria-live/);
});

test("mobile admin navigation and contact detail stay within narrow screens", () => {
  const css = read("src/app/admin/admin.module.css");
  assert.match(css, /@media \(max-width:\s*480px\)[\s\S]*\.mobileNav\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.contactDetail/);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.contactDetail\s*\{[^}]*position:\s*fixed/s);
});
