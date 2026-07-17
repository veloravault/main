import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const adminRoutes = [
  "src/app/api/admin/activity/route.ts",
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

test("activity is a real paginated audit feed without sensitive payloads", () => {
  const route = read("src/app/api/admin/activity/route.ts");
  const repository = read("src/lib/server/access-repository.ts");

  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /parseAdminActivityCursor/);
  assert.match(route, /listAdminActivity/);
  assert.match(repository, /ADMIN_ACTIVITY_PAGE_SIZE\s*=\s*30/);
  assert.match(repository, /\.from\("admin_audit_log"\)/);
  assert.match(repository, /\.select\("id,action,result_code,actor_user_id,member_user_id,created_at"\)/);
  assert.doesNotMatch(repository, /admin_audit_log[\s\S]{0,240}(payload|details|metadata)/i);
  assert.match(repository, /ADMIN_ACTIVITY_TIMESTAMP/);
  assert.match(repository, /ADMIN_ACTIVITY_CURSOR/);
});

test("updated member DTOs re-read the authoritative plan after the mutation RPC", () => {
  const repository = read("src/lib/server/access-repository.ts");
  assert.match(repository, /rpc\("mutate_member_status"[\s\S]*\.from\("app_members"\)[\s\S]*\.select\("user_id,email,status,plan,access_request_id,approved_at,activated_at,created_at"\)/);
  assert.match(repository, /return \{ kind: "updated", member: memberDto\(updatedMember as MemberRow\) \}/);
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

test("member mutation accepts only suspended or revoked and member lists are DTO-only", () => {
  const route = read("src/app/api/admin/members/[id]/route.ts");
  const listRoute = read("src/app/api/admin/members/route.ts");
  const repository = read("src/lib/server/access-repository.ts");

  assert.match(route, /status\s*!==\s*"suspended"/);
  assert.match(route, /status\s*!==\s*"revoked"/);
  assert.match(route, /Object\.keys/);
  assert.match(repository, /MEMBER_PAGE_SIZE\s*=\s*25/);
  assert.match(listRoute, /UNSAFE_SEARCH/);
  assert.match(repository, /\.select\("user_id,email,status,plan,access_request_id,approved_at,activated_at,created_at"\)/);
  assert.doesNotMatch(repository, /\.select\(\s*"\*"|\.range\(|offset/i);
});

test("member status mutation is one locked transactional RPC with monotonic transitions and atomic audit", () => {
  const route = read("src/app/api/admin/members/[id]/route.ts");
  const repository = read("src/lib/server/access-repository.ts");
  const schema = read("invite_access_schema.sql");

  assert.match(repository, /rpc\("mutate_member_status"/);
  assert.doesNotMatch(repository, /export async function recordMemberAudit/);
  assert.doesNotMatch(route, /recordMemberAudit|console\.error\("ADMIN_AUDIT_WRITE_FAILED"/);
  assert.match(route, /result\.kind\s*===\s*"not_found"[\s\S]*MEMBER_NOT_FOUND[\s\S]*404/);
  assert.match(route, /result\.kind\s*===\s*"conflict"[\s\S]*MEMBER_STATUS_CONFLICT[\s\S]*409/);

  assert.match(schema, /create or replace function public\.mutate_member_status\(/i);
  assert.match(schema, /p_admin_id is null[\s\S]*p_member_id is null[\s\S]*p_now is null[\s\S]*p_status is null/i);
  assert.match(schema, /from public\.app_members as member[\s\S]*for update/i);
  assert.match(schema, /current_member\.status\s*=\s*'revoked'/i);
  assert.match(schema, /current_member\.status\s*=\s*'suspended'[\s\S]*p_status\s*=\s*'suspended'/i);
  assert.match(schema, /update public\.app_members[\s\S]*insert into public\.admin_audit_log/i);
  assert.match(schema, /action[\s\S]*case p_status[\s\S]*when 'suspended' then 'suspend'[\s\S]*else 'revoke'/i);
  assert.match(schema, /revoke all on function public\.mutate_member_status\(uuid, uuid, text, timestamptz\) from public, anon, authenticated/i);
  assert.match(schema, /grant execute on function public\.mutate_member_status\(uuid, uuid, text, timestamptz\) to service_role/i);
});

test("self-signup provisioning and activation are service-role-only RPCs that tolerate no linked access request", () => {
  const repository = read("src/lib/server/access-repository.ts");
  const migration = read("supabase/migrations/20260716232955_self_signup_membership.sql");

  assert.match(repository, /rpc\("provision_self_signup_member"/);
  assert.match(repository, /rpc\("activate_invited_member"/);
  assert.match(migration, /create or replace function public\.provision_self_signup_member/i);
  assert.match(migration, /revoke all on function public\.provision_self_signup_member\(uuid, text, timestamptz\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.provision_self_signup_member\(uuid, text, timestamptz\) to service_role/i);
  assert.match(migration, /create or replace function public\.activate_invited_member/i);
  assert.match(migration, /if request_id is null then/i);
});
