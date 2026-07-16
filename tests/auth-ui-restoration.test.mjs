import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("shared auth shell owns presentation without authentication", () => {
  const shell = read("src/components/auth/AuthShell.tsx");
  const css = read("src/components/auth/auth-shell.module.css");

  assert.match(shell, /export type AuthMode = "sign-in" \| "request-access"/);
  assert.match(shell, /Sign In/);
  assert.match(shell, /Request Access/);
  assert.match(shell, /AnimatePresence/);
  assert.doesNotMatch(shell, /useTheme|themeToggle/);
  assert.doesNotMatch(shell, /supabase|signInWithPassword|signUp|masterKey|masterPassword/);
  assert.doesNotMatch(shell, /AppleLockIcon|styles\.mark/);
  assert.doesNotMatch(css, /\.mark(?:\s|\{|\.)/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /\.heading\s*\+\s*\.content\s*\{[^}]*margin-top:\s*20px/s);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("gateway maps the historical second segment to request access", () => {
  const gateway = read("src/components/auth/AuthGateway.tsx");
  const signIn = read("src/components/auth/SignInForm.tsx");
  const request = read("src/components/access/RequestAccessForm.tsx");

  assert.match(gateway, /<SignInForm/);
  assert.match(gateway, /<RequestAccessForm/);
  assert.match(gateway, /initialMode/);
  assert.doesNotMatch(gateway, /signUp/);
  assert.match(signIn, /signInWithPassword/);
  assert.doesNotMatch(signIn, /masterKey|masterPassword|signUp/);
  assert.match(request, /JSON\.stringify\(\{ fullName, email, website \}\)/);
  assert.doesNotMatch(request, /password|masterKey|masterPassword/);
});

test("the complete account journey shares presentation and preserves secure handlers", () => {
  const accept = read("src/app/accept-invite/page.tsx");
  const onboardingPage = read("src/app/onboarding/page.tsx");
  const onboardingForm = read("src/components/auth/OnboardingForm.tsx");
  const reset = read("src/app/reset-password/page.tsx");

  for (const source of [accept, onboardingPage, reset]) assert.match(source, /AuthShell/);
  assert.match(accept, /action="\/auth\/confirm"/);
  assert.match(onboardingPage, /requireUser/);
  assert.match(onboardingPage, /getMembershipForUser/);
  assert.match(onboardingForm, /getExpectedUserAuthorization/);
  assert.match(onboardingForm, /setMasterKey\(masterKey, userId\)/);
  assert.match(reset, /exchangeCodeForSession/);
  assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
});
