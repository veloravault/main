import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const adminRoutes = [
  "src/app/api/admin/access-requests/route.ts",
  "src/app/api/admin/access-requests/[id]/approve/route.ts",
  "src/app/api/admin/access-requests/[id]/retry/route.ts",
  "src/app/api/admin/members/route.ts",
  "src/app/api/admin/members/[id]/route.ts",
];

test("every admin handler authorizes before any privileged repository operation", () => {
  for (const file of adminRoutes) {
    const source = read(file);
    const adminIndex = source.indexOf("await requireAdmin()");
    const repositoryIndex = source.search(/await (?:list|approve|update|mutate|suspend|revoke)/);
    assert.ok(adminIndex >= 0, `${file} must call requireAdmin`);
    assert.ok(repositoryIndex < 0 || adminIndex < repositoryIndex, `${file} must authorize first`);
    assert.doesNotMatch(source, /user_metadata|\.email\s*===|ADMIN_USER_IDS/);
  }
});

test("admin mutations enforce same origin before parsing a body", () => {
  for (const file of adminRoutes.filter((file) => file.includes("[id]"))) {
    const source = read(file);
    const originIndex = source.indexOf("assertSameOrigin(request)");
    const bodyIndex = source.search(/readBoundedJson\(|request\.json\(/);
    assert.ok(originIndex >= 0, `${file} must enforce same origin`);
    assert.ok(bodyIndex < 0 || originIndex < bodyIndex, `${file} must check origin before its body`);
    assert.doesNotMatch(source, /error\.message|JSON\.stringify\(error/);
  }
});

test("access request admin list is cursor-only, bounded to 25 DTO rows, and allowlists query parameters", () => {
  const route = read("src/app/api/admin/access-requests/route.ts");
  const repository = read("src/lib/server/access-repository.ts");

  assert.match(route, /status/);
  assert.match(route, /search/);
  assert.match(route, /cursor/);
  assert.match(route, /INVALID_QUERY/);
  assert.match(repository, /ACCESS_REQUEST_PAGE_SIZE\s*=\s*25/);
  assert.match(repository, /\.order\("requested_at",\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(repository, /\.order\("id",\s*\{\s*ascending:\s*false\s*\}\)/);
  assert.match(repository, /\.select\("id,full_name,email,status,requested_at,updated_at,invite_started_at,invited_at,invite_attempts,last_error_code"\)/);
  assert.match(repository, /SAFE_INVITATION_ERROR_CODES/);
  assert.match(repository, /safeInvitationErrorCode\(row\.last_error_code\)/);
  assert.doesNotMatch(repository, /\.select\(\s*"\*"|\.range\(|offset/i);
  assert.match(route, /\\p\{L\}/);
  assert.match(route, /\\p\{M\}/);
  assert.match(repository, /quotePostgrestFilterValue/);
  assert.match(repository, /full_name\.ilike\.\$\{searchLiteral\},email\.ilike\.\$\{searchLiteral\}/);
});

test("invitation claims and completion use atomic service-role-only database RPCs", () => {
  const repository = read("src/lib/server/access-repository.ts");
  const schema = read("invite_access_schema.sql");
  const approval = read("src/lib/access/approval.ts");

  assert.match(repository, /claim_access_request_invitation/);
  assert.match(repository, /complete_access_request_invitation/);
  assert.match(schema, /create or replace function public\.claim_access_request_invitation/i);
  assert.match(schema, /invite_attempts\s*=\s*request\.invite_attempts\s*\+\s*1/i);
  assert.match(schema, /status\s+in\s*\(\s*'pending'\s*,\s*'invite_failed'\s*\)/i);
  assert.match(schema, /invite_started_at\s*<\s*p_stale_before/i);
  assert.match(schema, /returns table \(id uuid, email text, full_name text, attempt integer\)/i);
  assert.match(schema, /p_attempt integer/i);
  assert.match(schema, /request\.invite_attempts\s*=\s*p_attempt/i);
  assert.match(repository, /p_attempt:\s*attempt/);
  assert.match(repository, /\.eq\("invite_attempts",\s*attempt\)/);
  assert.match(approval, /claim\.request\.attempt/);
  assert.match(schema, /revoke all on function public\.claim_access_request_invitation[\s\S]*from public, anon, authenticated/i);
});

test("provider reconciles before sending and maps errors to a closed safe-code set", () => {
  const invitations = read("src/lib/server/invitations.ts");

  assert.match(invitations, /import "server-only"/);
  assert.match(invitations, /auth\.admin\.listUsers/);
  assert.match(invitations, /auth\.admin\.inviteUserByEmail/);
  assert.match(invitations, /data:\s*\{\s*full_name:\s*fullName\s*\}/);
  assert.match(invitations, /redirectTo:\s*`\$\{requiredAppUrl\(\)\}\/accept-invite`/);
  for (const code of ["DELIVERY_FAILED", "ALREADY_INVITED", "RATE_LIMITED", "CONFIGURATION_ERROR"]) {
    assert.match(invitations, new RegExp(`\\b${code}\\b`));
  }
  assert.doesNotMatch(invitations, /return\s+(?:error\.)?message|throw\s+error/);
});

test("member mutation accepts only suspended or revoked and member lists are DTO-only", () => {
  const route = read("src/app/api/admin/members/[id]/route.ts");
  const listRoute = read("src/app/api/admin/members/route.ts");
  const repository = read("src/lib/server/access-repository.ts");

  assert.match(route, /status\s*!==\s*"suspended"/);
  assert.match(route, /status\s*!==\s*"revoked"/);
  assert.match(route, /Object\.keys/);
  assert.match(repository, /MEMBER_PAGE_SIZE\s*=\s*25/);
  assert.match(listRoute, /\\p\{L\}/);
  assert.match(repository, /\.select\("user_id,email,status,access_request_id,approved_at,activated_at,created_at"\)/);
  assert.doesNotMatch(repository, /\.select\(\s*"\*"|\.range\(|offset/i);
});
