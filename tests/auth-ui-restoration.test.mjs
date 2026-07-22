import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("shared auth shell owns presentation without authentication", () => {
  const shell = read("src/components/auth/AuthShell.tsx");
  const css = read("src/components/auth/auth-shell.module.css");

  assert.match(shell, /export type AuthMode = "sign-in" \| "sign-up"/);
  assert.match(shell, /AnimatePresence/);
  assert.doesNotMatch(shell, /useTheme|themeToggle/);
  assert.doesNotMatch(shell, /supabase|signInWithPassword|signUp\(|masterKey|masterPassword/);
  assert.doesNotMatch(shell, /AppleLockIcon|styles\.mark/);
  assert.doesNotMatch(css, /\.mark(?:\s|\{|\.)/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /\.heading\s*\+\s*\.content\s*\{[^}]*margin-top:\s*20px/s);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("gateway maps the second segment to sign-up", () => {
  const gateway = read("src/components/auth/AuthGateway.tsx");
  const signIn = read("src/components/auth/SignInForm.tsx");
  const signUp = read("src/components/auth/SignUpForm.tsx");

  assert.match(gateway, /<SignInForm/);
  assert.match(gateway, /<SignUpForm/);
  assert.match(gateway, /initialMode/);
  assert.match(signIn, /signInWithPassword/);
  assert.doesNotMatch(signIn, /masterKey|masterPassword|auth\.signUp/);
  assert.match(signUp, /auth\.signUp\(/);
  assert.match(signUp, /emailRedirectTo/);
  assert.doesNotMatch(signUp, /masterKey|masterPassword/);
});

test("the complete account journey shares presentation and preserves secure handlers", () => {
  const confirmSignup = read("src/app/confirm-signup/page.tsx");
  const onboardingPage = read("src/app/onboarding/page.tsx");
  const onboardingFlow = read("src/components/auth/OnboardingFlow.tsx");
  const reset = read("src/app/reset-password/page.tsx");
  const resetClient = read("src/components/auth/ResetPasswordClient.tsx");

  for (const source of [confirmSignup, resetClient]) assert.match(source, /AuthShell/);
  assert.match(reset, /<PublicPageShell>[\s\S]*<ResetPasswordClient/);
  assert.match(confirmSignup, /action="\/auth\/confirm-signup"/);
  assert.match(onboardingPage, /requireUser/);
  assert.match(onboardingPage, /getMembershipForUser/);
  assert.match(onboardingPage, /OnboardingFlow/);
  assert.doesNotMatch(onboardingFlow, /getExpectedUserAuthorization/);
  assert.match(onboardingFlow, /setMasterKey\(masterKey, userId\)/);
  assert.match(resetClient, /exchangeCodeForSession/);
  assert.match(resetClient, /auth\.updateUser\(\{ password \}\)/);
});

test("public authentication uses dedicated single-purpose pages under the standard site chrome", () => {
  const shell = read("src/components/velora/PublicPageShell.tsx");
  const login = read("src/app/login/page.tsx");
  const signup = read("src/app/signup/page.tsx");
  const gateway = read("src/components/auth/AuthGateway.tsx");
  const authShell = read("src/components/auth/AuthShell.tsx");
  const publicComponents = [
    "Nav.tsx",
    "Hero.tsx",
    "Pricing.tsx",
    "PricingPageContent.tsx",
    "FinalCTA.tsx",
    "BlogListContent.tsx",
    "BlogPostContent.tsx",
    "SecurityPageContent.tsx",
  ].map((name) => read(`src/components/velora/${name}`)).join("\n");

  assert.equal(existsSync(new URL("../src/components/auth/AuthModalProvider.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/components/auth/AccountFrame.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../src/components/auth/account-frame.module.css", import.meta.url)), false);

  for (const route of [login, signup]) {
    assert.match(route, /import \{ PublicPageShell \}/);
    assert.match(route, /<PublicPageShell>/);
    assert.doesNotMatch(route, /AccountFrame/);
  }

  assert.doesNotMatch(shell, /AuthModalProvider/);
  assert.doesNotMatch(publicComponents, /useAuthModal|openAuth/);
  assert.match(publicComponents, /href=["'{/]?[^\n]*\/signup/);
  assert.match(publicComponents, /href=["'{/]?[^\n]*\/login/);

  assert.doesNotMatch(gateway, /useState|setMode|variant/);
  assert.doesNotMatch(gateway, /embedded/);
  assert.match(gateway, /mode === "sign-in"/);
  assert.match(gateway, /href=\{mode === "sign-in" \? "\/signup" : "\/login"\}/);
  assert.doesNotMatch(authShell, /onModeChange|segmented|modalCard|variant|embedded/);
});
