import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const file = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(file(path), "utf8");

test("signup and onboarding share a four-stage accessible strength meter", () => {
  const meterPath = "src/components/auth/PasswordStrengthMeter.tsx";
  assert.equal(existsSync(file(meterPath)), true, `${meterPath} must exist`);

  const meter = read(meterPath);
  const signup = read("src/components/auth/SignUpForm.tsx");
  const masterKey = read("src/components/auth/onboarding-steps/MasterKeyStep.tsx");
  const css = read("src/components/auth/auth-shell.module.css");

  assert.match(meter, /weak:\s*1[\s\S]*fair:\s*2[\s\S]*strong:\s*3[\s\S]*"very-strong":\s*4/);
  assert.match(meter, /Array\.from\(\{ length:\s*4 \}/);
  assert.match(meter, /role="progressbar"/);
  assert.match(meter, /aria-valuemin=\{0\}/);
  assert.match(meter, /aria-valuemax=\{100\}/);
  assert.match(meter, /aria-valuenow=\{strength\.score\}/);
  assert.match(meter, /aria-valuetext=\{strength\.label\}/);
  assert.match(meter, /weak:\s*"var\(--auth-red\)"/);
  assert.match(meter, /fair:\s*"var\(--auth-amber\)"/);
  assert.match(meter, /strong:\s*"var\(--auth-blue\)"/);
  assert.match(meter, /"very-strong":\s*"var\(--auth-green\)"/);
  assert.match(css, /\.strengthTrack\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/s);
  assert.match(css, /\.strengthSegment\[data-active="true"\][^{]*\{[^}]*background:\s*var\(--strength-color\)/s);

  for (const consumer of [signup, masterKey]) {
    assert.match(consumer, /import \{ PasswordStrengthMeter \}/);
    assert.match(consumer, /<PasswordStrengthMeter strength=\{/);
    assert.doesNotMatch(consumer, /STRENGTH_COLOR_VAR/);
  }
});

test("onboarding uses one deliberate Apple-style Lucide symbol vocabulary", () => {
  const iconPath = "src/components/auth/onboarding-steps/OnboardingStepIcon.tsx";
  assert.equal(existsSync(file(iconPath)), true, `${iconPath} must exist`);

  const icon = read(iconPath);
  const intro = read("src/components/auth/onboarding-steps/IntroScreen.tsx");
  const steps = read("src/components/auth/onboarding-steps/onboardingSteps.ts");
  const avatar = read("src/components/auth/onboarding-steps/AvatarStep.tsx");
  const masterKey = read("src/components/auth/onboarding-steps/MasterKeyStep.tsx");
  const completion = read("src/components/auth/onboarding-steps/CompletionStep.tsx");
  const css = read("src/components/auth/onboarding.module.css");

  for (const symbol of ["KeyRoundIcon", "ShieldCheckIcon", "UserRoundIcon", "LockKeyholeIcon", "CircleCheckBigIcon"]) {
    assert.match(icon, new RegExp(symbol), `${symbol} belongs in the onboarding icon map`);
  }
  assert.match(icon, /vault:\s*KeyRoundIcon/);
  assert.match(icon, /security:\s*ShieldCheckIcon/);
  assert.match(icon, /avatar:\s*UserRoundIcon/);
  assert.match(icon, /"master-key":\s*LockKeyholeIcon/);
  assert.match(icon, /done:\s*CircleCheckBigIcon/);

  assert.match(steps, /icon:\s*"key"[\s\S]*icon:\s*"file-lock"[\s\S]*icon:\s*"shield-check"/);
  assert.match(steps, /icon:\s*"monitor-smartphone"[\s\S]*icon:\s*"eye-off"[\s\S]*icon:\s*"key-round"/);
  assert.match(steps, /Encrypted end to end - even from us/);
  assert.match(steps, /If you lose it, no one - including us - can recover your vault/);
  assert.match(intro, /BENEFIT_ICONS/);
  assert.doesNotMatch(intro, /\bCheckIcon\b/);

  assert.match(avatar, /<OnboardingStepIcon kind="avatar"/);
  assert.match(masterKey, /<OnboardingStepIcon kind="master-key"/);
  assert.match(completion, /<OnboardingStepIcon kind="done"/);
  assert.match(css, /\.stepIcon\s*\{[^}]*border-radius:\s*18px[^}]*background:/s);
  assert.doesNotMatch(`${icon}\n${intro}\n${avatar}\n${masterKey}\n${completion}`, /<svg|[🔐🔑🛡️✅]/u);
});
