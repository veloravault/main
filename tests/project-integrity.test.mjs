import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("document queries consistently use the vault_documents table", () => {
  const files = [
    "src/app/page.tsx",
    "src/components/Dashboard.tsx",
    "src/components/DocumentVault.tsx",
    "src/components/GlobalSearch.tsx",
  ];

  for (const file of files) {
    assert.equal(read(file).includes("secure_documents"), false, `${file} still references secure_documents`);
  }
});

test("SQL setup covers all vault tables and update policies preserve ownership", () => {
  const sql = [
    "supabase_schema.sql",
    "documents_schema.sql",
    "notes_schema.sql",
    "vault_update_schema.sql",
  ].map(read).join("\n");

  assert.match(sql, /create table if not exists secure_wallet/i);
  assert.match(sql, /vault_documents[\s\S]*category text/i);
  assert.match(sql, /on vault_items for update[\s\S]*with check\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)/i);
  assert.match(sql, /on secure_notes for update[\s\S]*with check\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)/i);
  assert.match(sql, /on secure_wallet for update[\s\S]*with check\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)/i);
});

test("raw account password and master key are not persisted in localStorage", () => {
  const auth = read("src/components/Auth.tsx");
  assert.equal(auth.includes("vault_password"), false);
  assert.equal(auth.includes("vault_master_key"), false);
  assert.equal(auth.includes("localStorage.setItem(\"vault_email\""), false);
});

test("client crypto does not depend on Node Buffer", () => {
  assert.equal(read("src/lib/crypto.ts").includes("Buffer."), false);
});

test("mobile shell keeps iOS-style safe areas and native tab treatment", () => {
  const page = read("src/app/page.tsx");
  const css = read("src/app/globals.css");

  assert.match(page, /ios-app-shell/);
  assert.match(page, /ios-mobile-header/);
  assert.match(page, /ios-mobile-tabbar/);
  assert.match(page, /ios-mobile-tab-indicator/);
  assert.match(page, /max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-7/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /--bottom-bar-height:\s*82px/);
  assert.match(css, /@media \(max-width:\s*767px\)/);
});
