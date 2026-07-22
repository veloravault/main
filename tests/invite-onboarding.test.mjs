import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { captureAccessTokenForExpectedUser } from "../src/lib/vaultKeyOwnership.ts";
import { putUserPasswordWithToken } from "../src/lib/auth/updateUserWithToken.ts";

const file = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(file(path), "utf8");

test("onboarding only sets the master key - the sign-in password is set at signup, not here", () => {
  const path = "src/components/auth/OnboardingFlow.tsx";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  assert.doesNotMatch(source, /getExpectedUserAuthorization|updateExpectedUserPassword/);
  assert.doesNotMatch(source, /type="password"[^>]*id="onboarding-password"/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(source, /if\s*\(masterKey\s*!==\s*masterKeyConfirmation\)/);
  assert.match(source, /JSON\.stringify\(\{\s*completed:\s*true,\s*expectedUserId:\s*userId\s*\}\)/);
  assert.doesNotMatch(source, /JSON\.stringify\([^)]*(?:masterKey|masterPassword)/s);
  assert.match(source, /setMasterKey\(masterKey,\s*userId\)/);
  assert.match(source, /setMasterKeyValue\(["']{2}\)/);
  assert.match(source, /setMasterKeyConfirmation\(["']{2}\)/);
  // After onboarding, preserve any paid-plan intent but wait for the explicit
  // completion action before leaving the final success screen.
  assert.match(source, /readPlanIntentCookie\(\)/);
  assert.match(source, /clearPlanIntentCookie\(\)/);
  assert.match(source, /setDestination\(intent\s*\?/);
  assert.match(source, /setIndex\(ONBOARDING_STEPS\.indexOf\("done"\)\)/);
  assert.match(source, /router\.replace\(destination\)/);
  assert.match(source, /<CompletionStep onContinue=\{continueToVault\}/);

  const liveRecheckIndex = source.indexOf("supabase.auth.getUser()");
  const activationIndex = source.indexOf('fetch("/api/onboarding/complete"');
  const keyIndex = source.indexOf("setMasterKey(masterKey");
  assert.ok(liveRecheckIndex >= 0 && liveRecheckIndex < activationIndex, "identity must be checked before activation");
  assert.ok(activationIndex < keyIndex, "durable membership activation must precede the local key handoff");
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

  assert.match(repository, /activateInvitedMember/);
  assert.match(sql, /create or replace function public\.activate_invited_member/i);
  assert.match(
    sql,
    /member_status = 'active'[\s\S]*request_status = 'active'[\s\S]*request_user_id = p_user_id[\s\S]*return 'active'/i,
  );
  assert.match(sql, /if request_id is null then[\s\S]*if member_status = 'active' then[\s\S]*return 'active'/i);
  for (const signature of [
    "public.activate_invited_member(uuid, timestamptz)",
    "public.provision_self_signup_member(uuid, text, timestamptz)",
  ]) {
    const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(sql, new RegExp(`revoke all on function ${escaped} from public, anon, authenticated`, "i"));
    assert.match(sql, new RegExp(`grant execute on function ${escaped} to service_role`, "i"));
  }
  assert.doesNotMatch(sql, /master_key|masterkey|master_password|masterpassword/i);
});
