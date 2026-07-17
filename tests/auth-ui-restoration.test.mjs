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

  for (const source of [confirmSignup, reset]) assert.match(source, /AuthShell/);
  assert.match(confirmSignup, /action="\/auth\/confirm-signup"/);
  assert.match(onboardingPage, /requireUser/);
  assert.match(onboardingPage, /getMembershipForUser/);
  assert.match(onboardingPage, /OnboardingFlow/);
  assert.doesNotMatch(onboardingFlow, /getExpectedUserAuthorization/);
  assert.match(onboardingFlow, /setMasterKey\(masterKey, userId\)/);
  assert.match(reset, /exchangeCodeForSession/);
  assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
});

test("public authentication uses dedicated single-purpose pages without a modal provider", () => {
  const shell = read("src/components/dreelio/PublicPageShell.tsx");
  const login = read("src/app/login/page.tsx");
  const signup = read("src/app/signup/page.tsx");
  const gateway = read("src/components/auth/AuthGateway.tsx");
  const authShell = read("src/components/auth/AuthShell.tsx");
  const css = read("src/components/auth/auth-shell.module.css");
  const accountFramePath = "src/components/auth/AccountFrame.tsx";
  const accountCssPath = "src/components/auth/account-frame.module.css";
  const publicComponents = [
    "Nav.tsx",
    "Hero.tsx",
    "Pricing.tsx",
    "PricingPageContent.tsx",
    "FinalCTA.tsx",
    "BlogListContent.tsx",
    "BlogPostContent.tsx",
    "SecurityPageContent.tsx",
  ].map((name) => read(`src/components/dreelio/${name}`)).join("\n");

  assert.equal(existsSync(new URL("../src/components/auth/AuthModalProvider.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL(`../${accountFramePath}`, import.meta.url)), true);
  assert.equal(existsSync(new URL(`../${accountCssPath}`, import.meta.url)), true);

  const accountFrame = read(accountFramePath);
  const accountCss = read(accountCssPath);

  for (const route of [login, signup]) {
    assert.match(route, /import \{ AccountFrame \}/);
    assert.match(route, /<AccountFrame>/);
    assert.doesNotMatch(route, /PublicPageShell/);
  }

  assert.doesNotMatch(accountFrame, /Footer|NAV_LINKS|PublicPageShell|burger/i);
  assert.match(accountFrame, /Velora Vault home/);
  assert.match(accountFrame, /Toggle appearance/);
  assert.doesNotMatch(accountCss, /position:\s*fixed/);
  assert.match(accountCss, /safe-area-inset-top/);
  assert.match(accountCss, /safe-area-inset-bottom/);
  assert.match(accountCss, /min-(?:width|height):\s*44px/);
  assert.doesNotMatch(shell, /AuthModalProvider/);
  assert.doesNotMatch(publicComponents, /useAuthModal|openAuth/);
  assert.match(publicComponents, /href=["'{/]?[^\n]*\/signup/);
  assert.match(publicComponents, /href=["'{/]?[^\n]*\/login/);

  assert.doesNotMatch(gateway, /useState|setMode|variant/);
  assert.match(gateway, /mode === "sign-in"/);
  assert.match(gateway, /href=\{mode === "sign-in" \? "\/signup" : "\/login"\}/);
  assert.doesNotMatch(authShell, /onModeChange|segmented|modalCard|variant/);
  assert.match(css, /embeddedPage/);
  assert.doesNotMatch(css, /--public-nav-clearance|--auth-top-space/);
});
