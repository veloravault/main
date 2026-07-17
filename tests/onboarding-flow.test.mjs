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
