import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

const file = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(file(path), "utf8");

const adminRoutes = [
  "src/app/api/admin/overview/route.ts",
  "src/app/api/admin/activity/route.ts",
  "src/app/api/admin/members/route.ts",
  "src/app/api/admin/members/[id]/route.ts",
  "src/app/api/admin/members/[id]/setup-email/route.ts",
  "src/app/api/admin/support/route.ts",
  "src/app/api/admin/support/[id]/route.ts",
  "src/app/api/admin/support/[id]/messages/route.ts",
];

test("admin overview authorizes before returning narrow operational aggregates", () => {
  const routePath = file("src/app/api/admin/overview/route.ts");
  const repositoryPath = file("src/lib/server/admin-overview-repository.ts");
  assert.equal(existsSync(routePath), true, "admin overview route must exist");
  assert.equal(existsSync(repositoryPath), true, "admin overview repository must exist");

  const route = read("src/app/api/admin/overview/route.ts");
  const repository = read("src/lib/server/admin-overview-repository.ts");
  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /getAdminOverview/);
  assert.match(repository, /\.from\("app_members"\)/);
  assert.match(repository, /\.from\("support_tickets"\)/);
  assert.match(repository, /\.select\("size_bytes"\)/);
  assert.match(repository, /\.from\("ai_usage_events"\)/);
  assert.doesNotMatch(repository, /ciphertext|encrypted|message.*body|access_token|refresh_token|metadata/i);
});

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

test("activity validates category and result filters and support operations are audited", () => {
  const route = read("src/app/api/admin/activity/route.ts");
  const repository = read("src/lib/server/access-repository.ts");
  const supportRepository = read("src/lib/server/support-repository.ts");
  const replyRoute = read("src/app/api/admin/support/[id]/messages/route.ts");
  const ticketRoute = read("src/app/api/admin/support/[id]/route.ts");

  for (const category of ["all", "access", "support", "invitation", "system"]) {
    assert.match(route, new RegExp(`"${category}"`));
  }
  for (const result of ["all", "success", "failure"]) {
    assert.match(route, new RegExp(`"${result}"`));
  }
  assert.match(route, /listAdminActivity\(\{ cursor, category, result \}\)/);
  assert.match(repository, /category:\s*AdminActivityCategory/);
  assert.match(repository, /result:\s*AdminActivityResult/);
  assert.match(repository, /ADMIN_ACTIVITY_ACTIONS/);
  assert.match(repository, /ADMIN_ACTIVITY_FAILURE_RESULTS/);

  assert.match(replyRoute, /const admin = await requireAdmin\(\)/);
  assert.match(replyRoute, /adminId:\s*admin\.id/);
  assert.match(ticketRoute, /const admin = await requireAdmin\(\)/);
  assert.match(ticketRoute, /adminId:\s*admin\.id/);
  assert.match(supportRepository, /action:\s*"support_reply"/);
  assert.match(supportRepository, /status === "resolved" \? "support_resolve" : "support_reopen"/);
});

test("updated member DTOs re-read the authoritative plan after the mutation RPC", () => {
  const repository = read("src/lib/server/access-repository.ts");
  assert.match(repository, /rpc\("mutate_member_status"[\s\S]*\.from\("app_members"\)[\s\S]*\.select\("user_id,email,status,plan,access_request_id,approved_at,activated_at,created_at"\)/);
  assert.match(repository, /return \{ kind: "updated", member: memberDto\(updatedMember as MemberRow\) \}/);
});

test("member detail and setup-email operations are owner-safe and DTO-only", () => {
  const detailRepositoryPath = file("src/lib/server/member-operations.ts");
  const setupRoutePath = file("src/app/api/admin/members/[id]/setup-email/route.ts");
  assert.equal(existsSync(detailRepositoryPath), true, "member operations repository must exist");
  assert.equal(existsSync(setupRoutePath), true, "member setup-email route must exist");

  const memberRoute = read("src/app/api/admin/members/[id]/route.ts");
  const setupRoute = read("src/app/api/admin/members/[id]/setup-email/route.ts");
  const repository = read("src/lib/server/member-operations.ts");
  assert.match(memberRoute, /export async function GET/);
  assert.match(memberRoute, /getMemberDetailAdmin/);
  assert.match(setupRoute, /await requireAdmin\(\)[\s\S]*assertSameOrigin\(request\)/);
  assert.match(setupRoute, /readBoundedJson/);
  assert.match(setupRoute, /sendMemberSetupEmailAdmin/);
  assert.match(repository, /resetPasswordForEmail/);
  assert.match(repository, /isConfiguredAdminUserId/);
  assert.match(repository, /\.from\("vault_items"\)/);
  assert.match(repository, /\.from\("vault_documents"\)/);
  assert.match(repository, /\.from\("secure_notes"\)/);
  assert.match(repository, /\.from\("secure_wallet"\)/);
  assert.doesNotMatch(repository, /encrypted_data|encrypted_content|ciphertext|\biv\b|\bsalt\b|storage_path/);
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

test("member mutation accepts only active, suspended, or revoked and member lists are DTO-only", () => {
  const route = read("src/app/api/admin/members/[id]/route.ts");
  const listRoute = read("src/app/api/admin/members/route.ts");
  const repository = read("src/lib/server/access-repository.ts");

  assert.match(route, /status\s*!==\s*"active"/);
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

test("configured owners cannot be mutated through member operations", () => {
  const route = read("src/app/api/admin/members/[id]/route.ts");
  const repository = read("src/lib/server/access-repository.ts");
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  assert.match(route, /id === admin\.id\s*\|\|\s*isConfiguredAdminUserId\(id\)/);
  assert.match(repository, /isOwner:\s*isConfiguredAdminUserId\(row\.user_id\)/);
  assert.match(consoleSource, /!member\.isOwner/);
});

test("a suspended member can be restored to active, but a revoked member can never be restored", () => {
  const migrationName = readdirSync(file("supabase/migrations"), { withFileTypes: true })
    .find((entry) => entry.isFile() && entry.name.endsWith("_admin_restore_access.sql"))?.name;
  assert.ok(migrationName, "admin_restore_access migration must be generated by the Supabase CLI");
  const migration = read(`supabase/migrations/${migrationName}`);

  assert.match(migration, /p_status not in \('active',\s*'suspended',\s*'revoked'\)/i);
  assert.match(migration, /current_member\.status\s*=\s*'revoked'[\s\S]*?current_member\.status\s*=\s*p_status/i);
  assert.match(migration, /case p_status[\s\S]*when 'suspended' then 'suspend'[\s\S]*when 'revoked' then 'revoke'[\s\S]*else 'restore'/i);

  const route = read("src/app/api/admin/members/[id]/route.ts");
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  assert.match(route, /status\s*!==\s*"active"/);
  assert.match(consoleSource, /canRestore\s*=\s*!member\.isOwner\s*&&\s*member\.status\s*===\s*"suspended"/);
  assert.match(consoleSource, /Restore access/);
});

test("support tickets: members can only read/reply on their own active-member ticket; only the service role changes status or replies as owner", () => {
  const migrationName = readdirSync(file("supabase/migrations"), { withFileTypes: true })
    .find((entry) => entry.isFile() && entry.name.endsWith("_support_tickets.sql"))?.name;
  assert.ok(migrationName, "support_tickets migration must be generated by the Supabase CLI");
  const migration = read(`supabase/migrations/${migrationName}`);

  assert.match(migration, /create table if not exists public\.support_tickets/i);
  assert.match(migration, /create table if not exists public\.support_ticket_messages/i);
  assert.match(migration, /status text not null default 'open' check \(status in \('open', 'resolved'\)\)/i);
  assert.match(migration, /sender text not null check \(sender in \('member', 'owner'\)\)/i);

  // Members only ever get select/insert; status changes and owner replies
  // require the service role (the admin API routes behind requireAdmin()).
  assert.match(migration, /grant select, insert on public\.support_tickets to authenticated/i);
  assert.match(migration, /grant select, insert on public\.support_ticket_messages to authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on public\.support_tickets, public\.support_ticket_messages to service_role/i);
  assert.doesNotMatch(migration, /grant update on public\.support_tickets to authenticated/i);

  // Every member-facing policy requires both ownership and active membership.
  const memberPolicyBlock = migration.slice(migration.indexOf('create policy "Members view their own tickets"'));
  for (const clause of [
    /\(select auth\.uid\(\)\) = user_id/,
    /member\.status = 'active'/,
  ]) {
    assert.match(memberPolicyBlock, clause);
  }
  assert.match(migration, /create policy "Members reply on their own tickets"[\s\S]*with check \(\s*sender = 'member'/i);

  // A member reply reopens a resolved ticket and stamps who spoke last; this
  // runs security definer since members have no UPDATE grant on the parent row.
  assert.match(migration, /security definer/i);
  assert.match(migration, /status = case when new\.sender = 'member' then 'open' else status end/i);
  assert.match(migration, /after insert on public\.support_ticket_messages/i);

  const supportRoute = read("src/app/api/admin/support/[id]/route.ts");
  assert.match(supportRoute, /TICKET_STATUSES\.includes\(status as TicketStatus\)/);
  const repository = read("src/lib/server/support-repository.ts");
  assert.doesNotMatch(repository, /\.select\(\s*"\*"\s*\)/);
});

test("support inbox validates all operational filters and needs-reply semantics", () => {
  const route = read("src/app/api/admin/support/route.ts");
  const repository = read("src/lib/server/support-repository.ts");
  assert.match(route, /"open",\s*"needs_reply",\s*"resolved",\s*"all"/);
  assert.match(route, /listSupportTicketsAdmin\(\{ filter, cursor \}\)/);
  assert.match(repository, /filter:\s*TicketFilter/);
  assert.match(repository, /args\.filter === "needs_reply"[\s\S]*\.eq\("status", "open"\)[\s\S]*\.eq\("last_message_by", "member"\)/);
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
