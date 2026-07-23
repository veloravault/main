import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const dangerSettingsSource = readFileSync(new URL("../src/components/settings/DangerSettings.tsx", import.meta.url), "utf8");
const deleteAccountSource = readFileSync(new URL("../src/app/api/delete-account/route.ts", import.meta.url), "utf8");
const memberOperationsSource = readFileSync(new URL("../src/lib/server/member-operations.ts", import.meta.url), "utf8");
const adminTypesSource = readFileSync(new URL("../src/components/admin/types.ts", import.meta.url), "utf8");
const adminMemberDetailSource = readFileSync(new URL("../src/components/admin/AdminMemberDetail.tsx", import.meta.url), "utf8");

test("Clear vault data deletes secure_credentials rows, not just the original 4 tables", () => {
  assert.match(
    dangerSettingsSource,
    /userClient\.from\("secure_credentials"\)\.delete\(\)\.neq\("id", "00000000-0000-0000-0000-000000000000"\)/,
    "the self-service wipe must also erase SSH keys/crypto/API/WiFi/2FA rows, or the UI's \"every item\" promise is false",
  );
});

test("account deletion removes secure_credentials rows explicitly, matching the other vault tables", () => {
  assert.match(deleteAccountSource, /\["vault_documents", "vault_items", "secure_notes", "secure_wallet", "secure_credentials"\]/);
});

test("admin per-member usage counts secure_credentials, both in the query and the returned DTO", () => {
  assert.match(memberOperationsSource, /admin\.from\("secure_credentials"\)\.select\("id", \{ count: "exact", head: true \}\)\.eq\("user_id", memberId\)/);
  assert.match(memberOperationsSource, /credentials: credentials\.count \?\? 0/);
  assert.match(memberOperationsSource, /credentials: number;/);
  assert.match(adminTypesSource, /credentials: number;/);
});

test("the admin member-detail usage grid renders a Credentials row", () => {
  assert.match(adminMemberDetailSource, /\{ label: "Credentials", value: usage\.credentials, Icon: KeySquareIcon \}/);
});
