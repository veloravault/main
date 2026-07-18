import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("public contact endpoint enforces origin and bounded JSON", () => {
  const source = read("src/app/api/contact/route.ts");
  assert.match(source, /assertSameOrigin\(request\)/);
  assert.match(source, /readBoundedJson\(request,\s*CONTACT_BODY_LIMIT\)/);
  assert.match(source, /parseContactSubmission\(payload\)/);
  assert.match(source, /submission\.company/);
});

test("contact repository hashes the client address and does not persist it", () => {
  const source = read("src/lib/server/contact-repository.ts");
  assert.match(source, /createHmac\("sha256"/);
  assert.match(source, /CONTACT_RATE_LIMIT_SALT/);
  assert.match(source, /submit_contact_message/);
  assert.doesNotMatch(source, /client_ip\s*:/);
});

test("contact migration is private and grants only service-role access", () => {
  const migrationDirectory = path.join(root, "supabase/migrations");
  const migrationName = fs.readdirSync(migrationDirectory).find((name) => name.endsWith("_contact_submissions.sql"));
  assert.ok(migrationName, "expected CLI-generated contact_submissions migration");
  const source = fs.readFileSync(path.join(migrationDirectory, migrationName), "utf8");

  assert.match(source, /create table public\.contact_submissions/i);
  assert.match(source, /enable row level security/i);
  assert.match(source, /revoke all on table public\.contact_submissions from anon, authenticated/i);
  assert.match(source, /grant (?:select, insert, update|all) on table public\.contact_submissions to service_role/i);
  assert.match(source, /create or replace function public\.submit_contact_message/i);
  assert.match(source, /revoke all on function public\.submit_contact_message/i);
  assert.match(source, /grant execute on function public\.submit_contact_message[^;]+ to service_role/i);
  assert.doesNotMatch(source, /security definer/i);
});
