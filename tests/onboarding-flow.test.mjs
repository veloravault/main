import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const file = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(file(path), "utf8");

test("step model lists the five steps in flow order with avatar as the skip target", () => {
  const path = "src/components/auth/onboarding-steps/onboardingSteps.ts";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  // Exact ordered step ids.
  assert.match(source, /"vault",\s*"security",\s*"avatar",\s*"master-key",\s*"done"/);
  // Skip-intro must jump to the first interactive step (avatar).
  assert.match(source, /FIRST_INTERACTIVE_INDEX\s*=\s*ONBOARDING_STEPS\.indexOf\("avatar"\)/);
  // Headings exist for every step id.
  for (const id of ["vault", "security", "avatar", "master-key", "done"]) {
    assert.match(source, new RegExp(`"${id}"\\s*:\\s*\\{`), `heading for ${id}`);
  }
  // Intro content only for the two intro steps.
  assert.match(source, /INTRO_CONTENT[\s\S]*"vault"[\s\S]*"security"/);
  // Motion respects reduced motion (opacity-only path).
  assert.match(source, /reduceMotion/);
});

test("presentational step components exist and stay logic-free", () => {
  const steps = {
    intro: "src/components/auth/onboarding-steps/IntroScreen.tsx",
    avatar: "src/components/auth/onboarding-steps/AvatarStep.tsx",
    masterKey: "src/components/auth/onboarding-steps/MasterKeyStep.tsx",
    completion: "src/components/auth/onboarding-steps/CompletionStep.tsx",
  };
  for (const path of Object.values(steps)) {
    assert.equal(existsSync(file(path)), true, `${path} must exist`);
  }
  // No security-critical logic may live in the presentational layer.
  for (const path of Object.values(steps)) {
    const source = read(path);
    assert.doesNotMatch(source, /supabase|fetch\(|setMasterKey|onboarding\/complete|PlanIntent/i, `${path} must stay presentational`);
  }
  // MasterKeyStep exposes the two known input ids and defers submit to the parent.
  const masterKey = read(steps.masterKey);
  assert.match(masterKey, /id="onboarding-master-key"/);
  assert.match(masterKey, /id="onboarding-master-key-confirmation"/);
  assert.doesNotMatch(masterKey, /onSubmit|masterKeyConfirmation\s*!==|preventDefault/);
  // AvatarStep offers both preset kinds and a clear (skip) affordance.
  const avatar = read(steps.avatar);
  assert.match(avatar, /"male"[\s\S]*"female"/);
  assert.match(avatar, /onSelect\(null\)/);
});

test("orchestrator preserves the onboarding security contract", () => {
  const path = "src/components/auth/OnboardingFlow.tsx";
  assert.equal(existsSync(file(path)), true, `${path} must exist`);
  const source = read(path);

  // No password sign-in logic, no storage APIs, no stray password input id.
  assert.doesNotMatch(source, /getExpectedUserAuthorization|updateExpectedUserPassword/);
  assert.doesNotMatch(source, /type="password"[^>]*id="onboarding-password"/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);

  // Validation + contract payload + key handoff + field clearing.
  assert.match(source, /if\s*\(masterKey\s*!==\s*masterKeyConfirmation\)/);
  assert.match(source, /JSON\.stringify\(\{\s*completed:\s*true,\s*expectedUserId:\s*userId\s*\}\)/);
  assert.doesNotMatch(source, /JSON\.stringify\([^)]*(?:masterKey|masterPassword)/s);
  assert.match(source, /setMasterKey\(masterKey,\s*userId\)/);
  assert.match(source, /setMasterKeyValue\(["']{2}\)/);
  assert.match(source, /setMasterKeyConfirmation\(["']{2}\)/);

  // Plan-intent redirect (ternary form) with a literal /vault fallback.
  assert.match(source, /router\.replace\(\s*intent\s*\?/);
  assert.match(source, /:\s*["']\/vault["']\)/);

  // Ordering invariant: identity re-check -> activation -> key handoff.
  const liveRecheckIndex = source.indexOf("supabase.auth.getUser()");
  const activationIndex = source.indexOf('fetch("/api/onboarding/complete"');
  const keyIndex = source.indexOf("setMasterKey(masterKey");
  assert.ok(liveRecheckIndex >= 0 && liveRecheckIndex < activationIndex, "identity must be checked before activation");
  assert.ok(activationIndex < keyIndex, "activation must precede the local key handoff");
});
