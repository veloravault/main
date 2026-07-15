import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { captureAccessTokenForExpectedUser } from "../src/lib/vaultKeyOwnership.ts";
import { putUserPasswordWithToken } from "../src/lib/auth/updateUserWithToken.ts";

const file = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(file(path), "utf8");

test("invitation GET is a non-consuming explicit-confirmation landing", () => {
  const path = "src/app/accept-invite/page.tsx";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  assert.match(source, /searchParams:\s*Promise</);
  assert.match(source, /await searchParams/);
  assert.match(source, /type\s*===\s*["']invite["']/);
  assert.match(source, /token_hash/);
  assert.match(source, /action=["']\/auth\/confirm["']/);
  assert.match(source, /method=["']post["']/i);
  assert.doesNotMatch(source, /verifyOtp|exchangeCodeForSession|createServerSupabaseClient/);
  assert.doesNotMatch(source, /has not been used|not been used yet/i);
  assert.match(source, /ready to be verified/i);
});

test("confirmation route consumes invitation tokens only on POST", () => {
  const path = "src/app/auth/confirm/route.ts";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  assert.match(source, /export\s+async\s+function\s+POST\s*\(/);
  assert.doesNotMatch(source, /export\s+(?:async\s+)?function\s+GET\s*\(/);
  assert.match(source, /verifyOtp\(\{\s*token_hash:\s*tokenHash,\s*type:\s*["']invite["']\s*\}\)/s);
  assert.match(source, /reconcileConfirmedInvite/);
  assert.match(source, /auth\.signOut\(\)/);
  assert.match(source, /getAll\(["']token_hash["']\)\.length\s*!==\s*1/);
  assert.match(source, /size\s*>\s*MAX_CONFIRM_BYTES/);
});

test("default Supabase invite fragments are stripped and completed through the authenticated server session", () => {
  const page = read("src/app/accept-invite/page.tsx");
  const bridgePath = "src/components/auth/InviteFragmentBridge.tsx";
  const routePath = "src/app/auth/invite-session/route.ts";

  assert.equal(existsSync(file(bridgePath)), true, `${bridgePath} must exist`);
  assert.equal(existsSync(file(routePath)), true, `${routePath} must exist`);
  const bridge = read(bridgePath);
  const route = read(routePath);
  const nextConfig = read("next.config.ts");
  const browserSupabase = read("src/lib/supabase.ts");

  assert.match(page, /InviteFragmentBridge/);
  assert.match(bridge, /window\.location\.hash/);
  assert.match(bridge, /history\.replaceState/);
  assert.match(bridge, /useRef<Promise<void>\s*\|\s*null>/);
  assert.doesNotMatch(bridge, /let\s+cancelled\s*=/);
  assert.match(bridge, /access_token/);
  assert.match(bridge, /refresh_token/);
  assert.match(bridge, /type\s*!==\s*["']invite["']/);
  assert.match(bridge, /auth\.setSession\(\{\s*access_token:\s*accessToken,\s*refresh_token:\s*refreshToken,?\s*\}\)/s);
  assert.match(bridge, /fetch\(["']\/auth\/invite-session["']/);
  assert.doesNotMatch(bridge, /console\.(?:log|error)[^(]*\([^)]*(?:accessToken|refreshToken|hash)/s);

  assert.match(route, /assertSameOrigin\(request\)/);
  assert.match(route, /export\s+async\s+function\s+POST\s*\(/);
  assert.match(route, /auth\.getUser\(\)/);
  assert.match(route, /reconcileConfirmedInvite/);
  assert.doesNotMatch(route, /access_token|refresh_token|request\.json|request\.formData/);
  assert.match(nextConfig, /source:\s*["']\/auth\/invite-session["']\s*,\s*headers:\s*sensitiveAuthHeaders/);
  assert.match(browserSupabase, /detectSessionInUrl:\s*false/);
});

test("onboarding keeps sign-in password and master key as separate secrets", () => {
  const path = "src/components/auth/OnboardingForm.tsx";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  assert.match(source, /getExpectedUserAuthorization\(userId\)/);
  assert.match(source, /updateExpectedUserPassword\(accessToken,\s*password\)/);
  assert.doesNotMatch(source, /userClient\.auth\./);
  assert.match(source, /JSON\.stringify\(\{\s*completed:\s*true,\s*expectedUserId:\s*userId\s*\}\)/);
  assert.doesNotMatch(source, /JSON\.stringify\([^)]*(?:masterKey|masterPassword)/s);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(source, /if\s*\(masterKey\s*!==\s*masterKeyConfirmation\)/);
  assert.ok(
    source.indexOf("if (masterKey !== masterKeyConfirmation)") < source.indexOf("setMasterKey(masterKey"),
    "the local confirmation check must precede setMasterKey",
  );
  assert.ok(
    source.indexOf("response.ok") < source.indexOf("setMasterKey(masterKey"),
    "durable membership activation must precede the local key handoff",
  );
  assert.match(source, /setMasterKey\(masterKey,\s*userId\)/);
  assert.match(source, /setMasterKeyValue\(["']{2}\)/);
  assert.match(source, /setMasterKeyConfirmation\(["']{2}\)/);
  assert.match(source, /router\.replace\(["']\/vault["']\)/);

  const expectedAuthIndex = source.indexOf("getExpectedUserAuthorization(userId)");
  const passwordIndex = source.indexOf("updateExpectedUserPassword(accessToken, password)");
  const scopedRecheckIndex = source.indexOf("supabase.auth.getUser(accessToken)");
  const activationIndex = source.indexOf('fetch("/api/onboarding/complete"');
  const liveRecheckIndex = source.lastIndexOf("supabase.auth.getUser()");
  const keyIndex = source.indexOf("setMasterKey(masterKey");
  assert.ok(expectedAuthIndex < passwordIndex, "expected identity must be captured before password update");
  assert.ok(passwordIndex < scopedRecheckIndex, "the captured identity must be rechecked after password update");
  assert.ok(scopedRecheckIndex < activationIndex, "captured identity must remain valid before activation");
  assert.ok(activationIndex < liveRecheckIndex, "live browser identity must be checked after activation");
  assert.ok(liveRecheckIndex < keyIndex, "live identity must be checked before the local key handoff");
});

test("expected-user password update uses the captured token without a disabled auth proxy", async () => {
  const calls = [];
  await putUserPasswordWithToken({
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "publishable-key",
    accessToken: "captured-token-a",
    password: "new-password",
  }, async (input, init) => {
    calls.push({ input: String(input), init });
    return new Response(JSON.stringify({ id: "user-a" }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].input, /\/auth\/v1\/user$/);
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer captured-token-a");
  assert.deepEqual(JSON.parse(calls[0].init.body), { password: "new-password" });
});

test("a stale onboarding page cannot capture a different account token", async () => {
  const userA = "550e8400-e29b-41d4-a716-446655440001";
  const userB = "550e8400-e29b-41d4-a716-446655440002";
  await assert.rejects(
    captureAccessTokenForExpectedUser(userA, async () => "token-b", async () => userB),
    /expected authenticated user/,
  );
});

test("onboarding completion accepts only a marker and activates the cookie user", () => {
  const path = "src/app/api/onboarding/complete/route.ts";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  assert.match(source, /assertSameOrigin\(request\)/);
  assert.match(source, /readBoundedJson\(request,/);
  assert.match(source, /completed\s*!==\s*true/);
  assert.match(source, /user\.id\s*!==\s*expectedUserId/);
  assert.match(source, /Object\.keys\(body\)\.length\s*!==\s*2/);
  assert.match(source, /requireUser\(\)/);
  assert.match(source, /getMembershipForUser\(user\.id\)/);
  assert.match(source, /status\s*!==\s*["']invited["'][\s\S]*status\s*!==\s*["']active["']/);
  assert.match(source, /activateInvitedMember\(user\.id\)/);
  assert.doesNotMatch(source, /masterKey|masterPassword|password/);
});

test("privileged onboarding RPCs preserve terminal member states and are service-role only", () => {
  const sql = read("invite_access_schema.sql");
  const repository = read("src/lib/server/access-repository.ts");

  assert.match(repository, /reconcileConfirmedInvite/);
  assert.match(repository, /activateInvitedMember/);
  assert.match(sql, /create or replace function public\.reconcile_confirmed_invite/i);
  assert.match(sql, /create or replace function public\.activate_invited_member/i);
  assert.match(sql, /status\s+not in\s*\(\s*'active'\s*,\s*'suspended'\s*,\s*'revoked'\s*\)/i);
  assert.match(
    sql,
    /member_status = 'active'[\s\S]*request_status = 'active'[\s\S]*request_user_id = p_user_id[\s\S]*return 'active'/i,
  );
  for (const signature of [
    "public.reconcile_confirmed_invite(uuid, text, timestamptz)",
    "public.activate_invited_member(uuid, timestamptz)",
  ]) {
    const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(sql, new RegExp(`revoke all on function ${escaped} from public, anon, authenticated`, "i"));
    assert.match(sql, new RegExp(`grant execute on function ${escaped} to service_role`, "i"));
  }
  assert.doesNotMatch(sql, /master_key|masterkey|master_password|masterpassword/i);
});
