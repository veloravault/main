import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("vault has a server membership gate and a separate client app", () => {
  assert.equal(existsSync(new URL("../src/app/vault/page.tsx", import.meta.url)), true);
  const vaultPage = read("src/app/vault/page.tsx");
  assert.match(vaultPage, /requireActiveMember/);
  assert.match(vaultPage, /AuthorizationError/);
  assert.match(vaultPage, /UNAUTHENTICATED[\s\S]*\/login\?next=\/vault/);
  assert.match(vaultPage, /MEMBERSHIP_INVITED[\s\S]*\/onboarding/);
  assert.match(vaultPage, /MEMBERSHIP_MISSING[\s\S]*MEMBERSHIP_SUSPENDED[\s\S]*MEMBERSHIP_REVOKED[\s\S]*\/request-access\?state=not-approved/);
  assert.match(vaultPage, /<VaultApp/);
  assert.doesNotMatch(vaultPage, /["']use client["']/);
});

test("login uses async search params and does not create public accounts", () => {
  assert.equal(existsSync(new URL("../src/app/login/page.tsx", import.meta.url)), true);
  const loginPage = read("src/app/login/page.tsx");
  const login = read("src/components/auth/SignInForm.tsx");
  assert.match(loginPage, /searchParams:\s*Promise</);
  assert.match(loginPage, /await searchParams/);
  assert.match(loginPage, /parseSafeNextPath/);
  assert.match(login, /signInWithPassword/);
  assert.match(login, /Reset sign-in password/);
  assert.doesNotMatch(login, /signUp/);
  assert.doesNotMatch(login, /masterKey|masterPassword|Master Key/);
});

test("master key provider is memory-only and wraps vault clients", () => {
  const provider = read("src/components/auth/VaultKeyProvider.tsx");
  const layout = read("src/app/layout.tsx");
  const vaultApp = read("src/components/VaultApp.tsx");
  assert.doesNotMatch(provider, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(provider, /useState<string \| null>/);
  assert.match(provider, /useVaultKey/);
  assert.ok(layout.indexOf("<ThemeProvider") < layout.indexOf("<VaultKeyProvider"));
  assert.ok(layout.indexOf("<VaultKeyProvider") < layout.indexOf("<ToastProvider"));
  assert.match(vaultApp, /useVaultKey\(\)/);
  assert.match(vaultApp, /@\/app\/actions/);
  assert.doesNotMatch(vaultApp, /const \[masterPassword,\s*setMasterPassword\]/);
});

test("master key provider clears globally when the authenticated user changes or signs out", () => {
  const provider = read("src/components/auth/VaultKeyProvider.tsx");
  assert.match(provider, /supabase\.auth\.onAuthStateChange/);
  assert.match(provider, /previousUserId/);
  assert.match(provider, /currentUserId/);
  assert.match(provider, /shouldClearVaultKeyForAuthChange\(previousUserId,\s*currentUserId\)/);
  assert.match(provider, /scopeVaultKeyToAuthenticatedUser/);
  assert.match(provider, /setMasterKeyState\(null\)/);
  assert.match(provider, /clearLocalVaultSession\(\)/);
  assert.match(provider, /subscription\.unsubscribe\(\)/);
});

test("vault unlock is session-only and preserves PIN and biometrics", () => {
  const auth = read("src/components/Auth.tsx");
  const vaultApp = read("src/components/VaultApp.tsx");
  assert.doesNotMatch(auth, /signUp|signInWithPassword|initialSessionActive|initialEmail/);
  assert.doesNotMatch(auth, /type="email"|autoComplete="email"/);
  assert.doesNotMatch(auth, /autoComplete="current-password"/);
  assert.match(auth, /Master Key/);
  assert.match(auth, /savePinForMaster/);
  assert.match(auth, /unlockWithBiometrics/);
  assert.match(auth, /onLogin\(masterPassword\)/);
  assert.match(vaultApp, /if \(!loading\s*&&\s*!sessionUser\)\s*\{[\s\S]*router\.replace\("\/login\?next=\/vault"\)/);
  assert.match(
    vaultApp,
    /if \(loading\s*\|\|\s*!sessionUser\s*\|\|\s*!authenticatedUserId\s*\|\|\s*sessionUser\.id\s*!==\s*authenticatedUserId\)/,
  );
  assert.match(vaultApp, /if \(!masterPassword\)\s*\{[\s\S]*<Auth onLogin=\{handleLogin\}/);
  assert.doesNotMatch(vaultApp, /if \(!sessionUser\s*\|\|\s*!masterPassword\)[\s\S]*<Auth/);
});
