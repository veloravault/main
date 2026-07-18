import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("contact admin routes authorize before reading private submissions", () => {
  for (const file of ["src/app/api/admin/contact/route.ts", "src/app/api/admin/contact/[id]/route.ts"]) {
    const source = read(file);
    const authorization = source.indexOf("await requireAdmin()");
    const repositoryCall = source.search(/await (?:list|get|set)Contact/);
    assert.ok(authorization >= 0, `${file} must require admin access`);
    assert.ok(repositoryCall < 0 || authorization < repositoryCall, `${file} must authorize before repository access`);
  }
});

test("contact inbox supports only new, read, resolved, and all filters", () => {
  const route = read("src/app/api/admin/contact/route.ts");
  assert.match(route, /"new",\s*"read",\s*"resolved",\s*"all"/);
  assert.match(route, /parseContactSubmissionCursor/);
  assert.match(route, /listContactSubmissionsAdmin/);
});

test("contact status mutation is same-origin, bounded, and audited", () => {
  const route = read("src/app/api/admin/contact/[id]/route.ts");
  const repository = read("src/lib/server/contact-admin-repository.ts");
  assert.match(route, /const admin = await requireAdmin\(\)/);
  assert.match(route, /assertSameOrigin\(request\)/);
  assert.match(route, /readBoundedJson/);
  assert.match(route, /"new",\s*"read",\s*"resolved"/);
  assert.match(repository, /\.from\("admin_audit_log"\)/);
  assert.match(repository, /actor_user_id/);
});

test("contact DTO queries are narrow and never expose the rate-limit table", () => {
  const repository = read("src/lib/server/contact-admin-repository.ts");
  assert.match(repository, /CONTACT_SUBMISSION_PAGE_SIZE\s*=\s*25/);
  assert.match(repository, /\.from\("contact_submissions"\)/);
  assert.doesNotMatch(repository, /\.select\(\s*["']\*["']/);
  assert.doesNotMatch(repository, /contact_submission_rate_limits/);
});
