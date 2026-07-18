import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin overview is the default responsive operations landing view", () => {
  const overviewPath = new URL("../src/components/admin/AdminOverview.tsx", import.meta.url);
  assert.equal(existsSync(overviewPath), true, "AdminOverview.tsx must exist");

  const overview = read("src/components/admin/AdminOverview.tsx");
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  const sidebar = read("src/components/admin/AdminSidebar.tsx");
  const types = read("src/components/admin/types.ts");
  const css = read("src/app/admin/admin.module.css");

  assert.match(consoleSource, /<AdminOverview/);
  assert.match(consoleSource, /:\s*"overview"/);
  assert.match(sidebar, /id:\s*"overview"/);
  assert.match(types, /AdminView\s*=\s*"overview"/);
  for (const key of ["active", "invited", "suspended", "revoked", "free", "plus", "needsReply", "documentBytes", "aiEvents"]) {
    assert.match(types, new RegExp(key));
  }
  assert.match(overview, /\/api\/admin\/overview/);
  assert.match(overview, /aria-live/);
  assert.match(css, /\.overviewGrid/);
  assert.match(css, /grid-template-columns:\s*repeat\(4/);
});

test("admin page protects owner data and handles authentication outcomes", () => {
  const page = read("src/app/admin/page.tsx");
  assert.match(page, /requireAdmin\(\)/);
  assert.match(page, /AuthorizationError/);
  assert.match(page, /\/login\?next=\/admin/);
  assert.match(page, /Unauthorized/);
  assert.match(page, /adminEmail/);
});

test("admin console exposes the complete owner operations navigation", () => {
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  const sidebar = read("src/components/admin/AdminSidebar.tsx");

  for (const label of ["Overview", "Members", "Support", "Activity"]) {
    assert.match(sidebar, new RegExp(`label: "${label}"`));
  }
  assert.doesNotMatch(sidebar, /label: "Pending"|label: "Invited"/);
  assert.match(consoleSource, /useSearchParams/);
  assert.match(consoleSource, /useRouter/);
  assert.match(consoleSource, /250/);
  assert.match(consoleSource, /nextCursor/);
  assert.match(consoleSource, /member\.plan === "plus"/);
  assert.match(consoleSource, /setItems\(\(current\).*\.\.\.current.*\.\.\.page\.items/s);
});

test("admin components never expose public signup or a way to undo a revoke", () => {
  const sources = [
    "src/components/admin/AdminConsole.tsx",
    "src/components/admin/AdminSidebar.tsx",
  ].map(read).join("\n");

  assert.doesNotMatch(sources, /sign\s?up|create account/i);
  assert.doesNotMatch(sources, /\bundo\b/i);
});

test("query generations fence and abort stale initial and append requests", () => {
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  assert.match(consoleSource, /queryGenerationRef/);
  assert.match(consoleSource, /requestControllersRef/);
  assert.match(consoleSource, /new AbortController\(\)/);
  assert.match(consoleSource, /controller\.abort\(\)/);
  assert.match(consoleSource, /generation !== queryGenerationRef\.current/);
  assert.match(consoleSource, /appendError/);
  assert.match(consoleSource, /Retry loading more/);
});

test("only server-confirmed member status changes are applied through an accessible confirm step", () => {
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  assert.match(consoleSource, /response\.status === 401/);
  assert.match(consoleSource, /response\.status === 403/);
  assert.match(consoleSource, /response\.status === 404/);
  assert.match(consoleSource, /response\.status === 409/);
  assert.match(consoleSource, /AdminConfirmDialog/);
  assert.match(consoleSource, /pendingMutation/);
  assert.doesNotMatch(consoleSource, /window\.confirm/);
  const dialog = read("src/components/admin/AdminConfirmDialog.tsx");
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /event\.key === "Tab"/);
  const catchBlock = consoleSource.match(/catch \{([\s\S]*?)\n\s*\} finally/)?.[1] ?? "";
  assert.doesNotMatch(catchBlock, /setItems\(\(current\)/);
});

test("member rows open a responsive detail surface with safe owner controls", () => {
  const detailPath = new URL("../src/components/admin/AdminMemberDetail.tsx", import.meta.url);
  assert.equal(existsSync(detailPath), true, "AdminMemberDetail.tsx must exist");

  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  const detail = read("src/components/admin/AdminMemberDetail.tsx");
  const types = read("src/components/admin/types.ts");
  const css = read("src/app/admin/admin.module.css");
  assert.match(consoleSource, /AdminMemberDetail/);
  assert.match(consoleSource, /onSelectMember/);
  assert.match(types, /AdminMemberDetailDto/);
  for (const key of ["documentBytes", "documents", "aiEventsThisMonth", "passwords", "notes", "walletRecords", "bankAccounts", "supportTickets", "isOwner"]) {
    assert.match(types, new RegExp(key));
  }
  assert.match(detail, /Send setup link/);
  assert.match(detail, /isOwner/);
  assert.match(detail, /aria-modal="true"/);
  assert.match(detail, /aria-live/);
  assert.match(css, /\.memberDetailBackdrop/);
  assert.match(css, /\.memberDetailSheet/);
});

test("support uses a reliable split inbox and full-screen mobile thread", () => {
  const threadPath = new URL("../src/components/admin/AdminSupportThread.tsx", import.meta.url);
  assert.equal(existsSync(threadPath), true, "AdminSupportThread.tsx must exist");
  const support = read("src/components/admin/AdminSupport.tsx");
  const thread = read("src/components/admin/AdminSupportThread.tsx");
  const types = read("src/components/admin/types.ts");
  const css = read("src/app/admin/admin.module.css");
  for (const filter of ["open", "needs_reply", "resolved", "all"]) assert.match(types, new RegExp(filter));
  assert.match(support, /AdminSupportThread/);
  assert.match(support, /Needs reply/);
  assert.match(support, /if \(loading && items\.length === 0 && !activeTicketId\)/);
  assert.match(thread, /sending/);
  assert.match(thread, /reply/);
  assert.match(thread, /aria-live/);
  assert.match(thread, /threadRef/);
  assert.match(css, /\.supportWorkspace/);
  assert.match(css, /\.supportThread/);
  assert.match(css, /position:\s*fixed/);
});

test("activity view loads the real audit API and owner controls are usable", () => {
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  const activity = read("src/components/admin/AdminActivity.tsx");
  const sidebar = read("src/components/admin/AdminSidebar.tsx");
  const css = read("src/app/admin/admin.module.css");

  assert.match(consoleSource, /<AdminActivity/);
  assert.match(activity, /fetch\(`\/api\/admin\/activity/);
  assert.match(activity, /nextCursor/);
  assert.match(sidebar, /href="\/vault"/);
  assert.match(sidebar, /onSignOut/);
  assert.match(consoleSource, /supabase\.auth\.signOut/);
  assert.match(consoleSource, /view === "members"[\s\S]*className=\{styles\.search\}/);
  assert.match(css, /\.activityList/);
  assert.doesNotMatch(css, /5\.8rem/);
});

test("activity filters are URL-synced, responsive, and preserve pagination scope", () => {
  const activity = read("src/components/admin/AdminActivity.tsx");
  const css = read("src/app/admin/admin.module.css");

  assert.match(activity, /useSearchParams/);
  assert.match(activity, /usePathname/);
  for (const category of ["all", "access", "support", "invitation", "system"]) {
    assert.match(activity, new RegExp(`value: "${category}"`));
  }
  for (const result of ["all", "success", "failure"]) {
    assert.match(activity, new RegExp(`value: "${result}"`));
  }
  assert.match(activity, /params\.set\("category"/);
  assert.match(activity, /params\.set\("result"/);
  assert.match(activity, /category.*result.*cursor/s);
  assert.match(css, /\.activityFilters/);
});

test("client search normalization preserves human names and removes filter grammar", async () => {
  const helper = read("src/components/admin/admin-client.ts");
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  assert.match(helper, /normalize\("NFKC"\)/);
  assert.doesNotMatch(helper, /\\p\{Diacritic\}/);
  assert.match(helper, /,%\(\)/);
  assert.match(consoleSource, /normalizeAdminSearch/);
  assert.match(consoleSource, /rawUrlSearch !== urlSearch/);
  const { normalizeAdminSearch } = await import("../src/components/admin/admin-client.ts");
  assert.equal(normalizeAdminSearch("  José O'Connor  "), "José O'Connor");
  assert.equal(normalizeAdminSearch("R&D"), "R&D");
  assert.equal(normalizeAdminSearch("José,(100%)"), "José100");
});

test("query generations reset pagination and list authorization clears protected rows", () => {
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  assert.match(consoleSource, /setLoadingMore\(false\)[\s\S]*loadPage\(null, false, generation\)/);
  assert.match(consoleSource, /response\.status === 401[\s\S]*setItems\(\[\]\)[\s\S]*router\.replace\("\/login\?next=\/admin"\)/);
  assert.match(consoleSource, /response\.status === 403[\s\S]*setItems\(\[\]\)[\s\S]*setNextCursor\(null\)[\s\S]*router\.refresh\(\)/);
});

test("mobile sticky controls are notch-safe, touch-safe, and expose selection semantics", () => {
  const css = read("src/app/admin/admin.module.css");
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  assert.match(css, /\.mobileNav\s*\{[^}]*top:\s*calc\([^)]*env\(safe-area-inset-top/s);
  assert.match(css, /\.mobileNav button\s*\{[^}]*min-height:\s*44px/s);
  assert.match(consoleSource, /router\.push/);
  assert.match(consoleSource, /router\.replace/);
  assert.match(consoleSource, /aria-current=/);
});
