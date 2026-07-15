import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function sourceFiles(directory = new URL("../src/", import.meta.url)) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name, directory);
    if (entry.isDirectory()) return sourceFiles(new URL(`${url.href}/`));
    return /\.(?:ts|tsx)$/.test(entry.name) ? [url] : [];
  });
}

test("environment example prefers current Supabase keys and labels legacy fallbacks", () => {
  const env = read("env.example.txt");

  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "ADMIN_USER_IDS",
    "ACCESS_REQUEST_HMAC_SECRET",
    "APP_URL",
  ]) {
    assert.match(env, new RegExp(`^${name}=`, "m"), `${name} must be documented`);
  }

  assert.match(env, /legacy fallback only[^\n]*NEXT_PUBLIC_SUPABASE_ANON_KEY/i);
  assert.match(env, /legacy fallback only[^\n]*SUPABASE_SERVICE_ROLE_KEY/i);
  assert.match(env, /ACCESS_REQUEST_HMAC_SECRET=generate_at_least_32_random_bytes/);
});

test("invite email is a scanner-safe single-action authentication message", () => {
  const email = read("docs/supabase/invite-email.html");
  const links = email.match(/<a\b/gi) ?? [];

  assert.equal(links.length, 1, "the invitation must contain one link");
  assert.match(email, /{{\s*\.RedirectTo\s*}}\?token_hash={{\s*\.TokenHash\s*}}&amp;type=invite/);
  assert.doesNotMatch(email, /{{\s*\.SiteURL\s*}}/);
  assert.doesNotMatch(email, /\.ConfirmationURL|\.Data|full[_ ]?name|master key|<img\b|tracking/i);
});

test("rollout guide is ordered, activation-aware, and keeps hosted work operator-controlled", () => {
  const guide = read("docs/invite-only-rollout.md");
  const ordered = [
    "Database backup",
    "security_hardening.sql",
    "invite_access_schema.sql",
    "Data API grants and RLS",
    "Owner UUID and existing-member backfill",
    "Deployment environment",
    "Site URL and redirect allowlist",
    "Invitation template and email tracking",
    "Custom SMTP, SPF, DKIM, and DMARC",
    "Disable public signup",
    "Controlled invitation and onboarding",
    "Denial checks",
    "Retire legacy keys",
    "Rollback",
  ];

  let cursor = -1;
  for (const label of ordered) {
    const next = guide.indexOf(label);
    assert.ok(next > cursor, `${label} must appear in rollout order`);
    cursor = next;
  }

  assert.match(guide, /anon[\s\S]*authenticated[\s\S]*(secret|service_role)/i);
  assert.match(guide, /ADMIN_USER_IDS[\s\S]*immutable Auth UUID/i);
  assert.match(guide, /http:\/\/localhost:3000\/accept-invite/);
  assert.match(guide, /https:\/\/YOUR_PRODUCTION_ORIGIN\/accept-invite/);
  assert.match(guide, /public email signup[\s\S]*(disable|off)/i);
  assert.match(guide, /email tracking[\s\S]*disable/i);
  assert.match(guide, /accepted invitations[\s\S]*do not[\s\S]*(delete|drop)[\s\S]*app_members/i);
  assert.match(guide, /master key[\s\S]*(memory|client)[\s\S]*(never|not)[\s\S]*(network|Supabase)/i);
  assert.match(guide, /no hosted changes are performed by this repository/i);
});

test("invitation routes receive no-referrer, no-store, and noindex headers", () => {
  const config = read("next.config.ts");
  const sensitiveHeaders = config.match(/const sensitiveAuthHeaders\s*=\s*\[([\s\S]*?)\];/i);
  assert.ok(sensitiveHeaders, "sensitive auth headers must be centralized");
  assert.match(sensitiveHeaders[1], /Referrer-Policy[\s\S]*no-referrer/i);
  assert.match(sensitiveHeaders[1], /Cache-Control[\s\S]*no-store/i);
  assert.match(sensitiveHeaders[1], /X-Robots-Tag[\s\S]*noindex, nofollow/i);

  for (const source of ["/accept-invite", "/auth/confirm"]) {
    assert.match(
      config,
      new RegExp(`source:\\s*[\"']${source}[\"']\\s*,\\s*headers:\\s*sensitiveAuthHeaders`, "i"),
      `${source} needs route-specific headers`,
    );
  }

  assert.match(config, /source:\s*["']\/\(\.\*\)["'][\s\S]*X-Content-Type-Options[\s\S]*Permissions-Policy/i);
});

test("README explains local setup, invite architecture, and master-key boundary", () => {
  const readme = read("README.md");

  assert.match(readme, /npm install[\s\S]*env\.example\.txt[\s\S]*npm run dev/i);
  assert.match(readme, /request-access[\s\S]*admin[\s\S]*approve[\s\S]*accept-invite[\s\S]*onboarding[\s\S]*vault/i);
  assert.match(readme, /master key[\s\S]*client memory[\s\S]*(never|not)[\s\S]*(Auth|network|storage)/i);
  assert.match(readme, /docs\/invite-only-rollout\.md/);
});

test("every legacy privileged-key consumer prefers the modern Supabase secret", () => {
  const consumers = sourceFiles().filter((url) => readFileSync(url, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(consumers.length > 0, "expected at least one migration-compatible privileged consumer");

  for (const url of consumers) {
    assert.match(
      readFileSync(url, "utf8"),
      /process\.env\.SUPABASE_SECRET_KEY\s*\?\?\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY/,
      `${url.pathname} must prefer SUPABASE_SECRET_KEY before its legacy fallback`,
    );
  }

  assert.match(
    read("docs/invite-only-rollout.md"),
    /retire[\s\S]*legacy[\s\S]*(?:rg|grep)[\s\S]*build[\s\S]*runtime verification/i,
  );
});
