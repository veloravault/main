import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  captureAccessTokenForExpectedUser,
  commitForExpectedAuthenticatedUser,
  createCapturedAccessTokenProvider,
} from "../src/lib/vaultKeyOwnership.ts";

const USER_A = "550e8400-e29b-41d4-a716-446655440000";
const USER_B = "550e8400-e29b-41d4-a716-446655440001";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("a proof begun by User A cannot authorize an action after live auth switches to User B", () => {
  let liveUserId = USER_A;
  let authorizedActionUserId = null;
  const expectedUserId = liveUserId;

  liveUserId = USER_B;
  const accepted = commitForExpectedAuthenticatedUser(
    expectedUserId,
    (candidateUserId) => candidateUserId === liveUserId,
    (ownerUserId) => { authorizedActionUserId = ownerUserId; },
  );

  assert.equal(accepted, false);
  assert.equal(authorizedActionUserId, null);
});

test("captured access tokens are accepted only when getUser verifies the expected owner", async () => {
  const tokenA = await captureAccessTokenForExpectedUser(
    USER_A,
    async () => "token-a",
    async (accessToken) => accessToken === "token-a" ? USER_A : null,
  );
  assert.equal(tokenA, "token-a");

  await assert.rejects(
    captureAccessTokenForExpectedUser(USER_A, async () => "token-b", async () => USER_B),
    /expected authenticated user/i,
  );
});

test("a user-scoped client stays bound to captured User A token after the live token changes", async () => {
  let liveAccessToken = "token-a";
  const capturedAccessToken = liveAccessToken;
  const accessTokenProvider = createCapturedAccessTokenProvider(capturedAccessToken);

  liveAccessToken = "token-b";
  assert.equal(await accessTokenProvider(), "token-a");
  assert.equal(liveAccessToken, "token-b");
});

test("danger actions use one verified token and a non-persisting token-scoped client", () => {
  const authToken = read("src/lib/authToken.ts");
  const danger = read("src/components/settings/DangerSettings.tsx");
  const verification = read("src/components/settings/LocalVerificationSheet.tsx");

  assert.match(authToken, /getUser\(accessToken\)/);
  assert.match(authToken, /accessToken:\s*createCapturedAccessTokenProvider\(accessToken\)/);
  assert.match(authToken, /persistSession:\s*false/);
  assert.match(danger, /getExpectedUserAuthorization\(expectedUserId\)/);
  assert.match(danger, /vaultFetchWithAccessToken\([^,]+,\s*"\/api\/delete-account"/);
  assert.doesNotMatch(danger, /vaultFetch\(\s*"\/api\/delete-account"/);
  assert.match(danger, /userClient\.from\("vault_documents"\)/);
  // Documents live in R2 (no browser credentials), so they are cleared through
  // the user-token-scoped server route, not Supabase storage.
  assert.match(danger, /vaultFetchWithAccessToken\([^,]+,\s*"\/api\/storage\/delete"/);
  assert.match(verification, /onVerified:\s*\(expectedUserId:\s*string\)\s*=>\s*void/);
  assert.match(verification, /isAuthenticatedUserCurrent\(expectedUserId\)/);
});
