import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/components/Dashboard.tsx", import.meta.url), "utf8");

test("Dashboard fetches and displays a combined credentials count", () => {
  assert.match(source, /from\("secure_credentials"\)/);
  assert.match(source, /credentials:\s*0/);
  assert.match(source, /credentials:\s*credentialsList\.length/);
  assert.match(source, /label:\s*"Credentials"/);
});

test("the empty-vault check also accounts for credentials, so a credentials-only vault isn't shown as empty", () => {
  assert.match(source, /stats\.passwords === 0 && stats\.documents === 0 && stats\.notes === 0 && stats\.wallet === 0 && stats\.credentials === 0/);
});
