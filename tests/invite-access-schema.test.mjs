import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(new URL("../invite_access_schema.sql", import.meta.url), "utf8");
const policyPattern = /create policy "([^"]+)"\s+on (public\.[a-z_]+|storage\.objects)\s+for (select|insert|update|delete)\s+to authenticated\s+([\s\S]*?);/gi;
const activeMembershipPattern = /exists\s*\(\s*select 1 from public\.app_members member\s+where member\.user_id = \(select auth\.uid\(\)\)\s+and member\.status = 'active'\s*\)/i;
const tableOwnershipPattern = /\(select auth\.uid\(\)\)\s*=\s*user_id/i;
const storageOwnershipPattern = /\(storage\.foldername\(name\)\)\[1\]\s*=\s*\(select auth\.uid\(\)\)::text/i;

const policies = Array.from(sql.matchAll(policyPattern), ([, name, resource, operation, body]) => ({
  name,
  resource: resource.toLowerCase(),
  operation: operation.toLowerCase(),
  body,
}));

function policyFor(resource, operation, bucket) {
  const matches = policies.filter((policy) => {
    if (policy.resource !== resource || policy.operation !== operation) return false;
    return bucket === undefined || new RegExp(`bucket_id\\s*=\\s*'${bucket}'`, "i").test(policy.body);
  });

  assert.equal(matches.length, 1, `expected one ${operation.toUpperCase()} policy for ${bucket ?? resource}`);
  return matches[0];
}

function assertProtectedPolicy(policy, ownershipPattern) {
  const withCheckIndex = policy.body.search(/\bwith check\s*\(/i);
  const sections = policy.operation === "update"
    ? [policy.body.slice(0, withCheckIndex), policy.body.slice(withCheckIndex)]
    : [policy.body];

  for (const section of sections) {
    assert.match(section, ownershipPattern, `${policy.name} must enforce resource ownership`);
    assert.match(section, activeMembershipPattern, `${policy.name} must require active membership`);
  }

  if (policy.operation === "insert") {
    assert.match(policy.body, /^\s*with check\s*\(/i);
  } else {
    assert.match(policy.body, /^\s*using\s*\(/i);
  }
  if (policy.operation === "update") assert.match(policy.body, /\bwith check\s*\(/i);

  assert.match(
    sql,
    new RegExp(`drop policy if exists "${policy.name}" on ${policy.resource.replace(".", "\\.")}`, "i"),
    `${policy.name} must be replaced idempotently`,
  );
}

test("invite schema creates protected access tables and indexes", () => {
  for (const table of ["access_requests", "app_members", "admin_audit_log", "access_request_rate_limits"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /access_requests[\s\S]+email text not null unique check/i);
  assert.match(sql, /app_members[\s\S]+email text not null unique check/i);
  assert.match(sql, /where status in \('pending', 'invite_failed'\)/i);
  assert.match(sql, /revoke all[^;]+from anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.consume_access_request_rate_limit/i);
});

test("vault table policies protect the complete operation matrix", () => {
  const tables = ["vault_items", "vault_documents", "secure_notes", "secure_wallet"];
  const operations = ["select", "insert", "update", "delete"];

  for (const table of tables) {
    const resource = `public.${table}`;
    assert.equal(policies.filter((policy) => policy.resource === resource).length, operations.length);
    for (const operation of operations) {
      assertProtectedPolicy(policyFor(resource, operation), tableOwnershipPattern);
    }
  }
});

test("storage policies protect every private operation and preserve public avatar reads", () => {
  const matrix = [
    { bucket: "vault_documents", operations: ["select", "insert", "update", "delete"] },
    { bucket: "avatars", operations: ["insert", "update", "delete"] },
  ];

  assert.equal(policies.filter((policy) => policy.resource === "storage.objects").length, 7);
  for (const { bucket, operations } of matrix) {
    for (const operation of operations) {
      const policy = policyFor("storage.objects", operation, bucket);
      const withCheckIndex = policy.body.search(/\bwith check\s*\(/i);
      const sections = operation === "update"
        ? [policy.body.slice(0, withCheckIndex), policy.body.slice(withCheckIndex)]
        : [policy.body];
      for (const section of sections) {
        assert.match(section, new RegExp(`bucket_id\\s*=\\s*'${bucket}'`, "i"));
      }
      assertProtectedPolicy(policy, storageOwnershipPattern);
    }
  }

  assert.doesNotMatch(sql, /drop policy if exists "Avatar images are publicly accessible"/i);
});
