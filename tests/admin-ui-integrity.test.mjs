import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin page protects owner data and handles authentication outcomes", () => {
  const page = read("src/app/admin/page.tsx");
  assert.match(page, /requireAdmin\(\)/);
  assert.match(page, /AuthorizationError/);
  assert.match(page, /\/login\?next=\/admin/);
  assert.match(page, /Unauthorized/);
  assert.match(page, /adminEmail/);
});

test("admin console exposes the approved desktop sections and URL filters", () => {
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  const sidebar = read("src/components/admin/AdminSidebar.tsx");

  for (const label of ["Pending", "Invited", "Members", "Activity"]) {
    assert.match(sidebar, new RegExp(`label: "${label}"`));
  }
  assert.match(consoleSource, /useSearchParams/);
  assert.match(consoleSource, /useRouter/);
  assert.match(consoleSource, /250/);
  assert.match(consoleSource, /nextCursor/);
  assert.match(consoleSource, /setItems\(\(current\).*\.\.\.current.*\.\.\.page\.items/s);
});

test("mobile queue uses request cards and shared approval sheet", () => {
  const queue = read("src/components/admin/RequestQueue.tsx");
  const card = read("src/components/admin/RequestCard.tsx");
  const sheet = read("src/components/admin/ApprovalSheet.tsx");

  assert.match(queue, /<RequestCard/);
  assert.match(card, /minHeight:\s*44|styles\.touchTarget/);
  assert.match(sheet, /<AdaptiveSheet/);
  assert.match(sheet, /request\.fullName/);
  assert.match(sheet, /request\.email/);
  assert.match(sheet, /Sending invitation/);
});

test("approval states, shaped skeletons, and directed empty states are present", () => {
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  const queue = read("src/components/admin/RequestQueue.tsx");
  const skeleton = read("src/components/admin/AdminSkeleton.tsx");

  assert.match(consoleSource, /useToast\(\)/);
  assert.match(consoleSource, /aria-live="polite"/);
  assert.match(queue, /pending-empty/);
  assert.match(queue, /search-empty/);
  assert.match(queue, /invite_failed/);
  assert.match(queue, /Sending invitation/);
  assert.match(queue, /"Retry"/);
  assert.match(queue, /<StateView/);
  assert.match(skeleton, /rowSkeleton/);
  assert.match(skeleton, /cardSkeleton/);
});

test("admin components never expose public signup or post-invite undo", () => {
  const sources = [
    "src/components/admin/AdminConsole.tsx",
    "src/components/admin/RequestQueue.tsx",
    "src/components/admin/RequestCard.tsx",
    "src/components/admin/ApprovalSheet.tsx",
    "src/components/admin/AdminSidebar.tsx",
  ].map(read).join("\n");

  assert.doesNotMatch(sources, /sign\s?up|create account|request access/i);
  assert.doesNotMatch(sources, /\bundo\b/i);
});

test("approval sheet keeps complete theme tokens after it portals to body", () => {
  const css = read("src/app/admin/admin.module.css");
  const sheet = css.match(/\.approvalSheet\s*\{([^}]+)\}/)?.[1] ?? "";
  for (const token of ["--admin-ink", "--admin-muted", "--admin-line", "--admin-blue", "--admin-solid", "--admin-soft-blue"]) {
    assert.match(sheet, new RegExp(token));
  }
  assert.match(css, /:global\(\.dark\) \.approvalSheet/);
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

test("only server-confirmed invitation failure becomes durable Retry state", () => {
  const consoleSource = read("src/components/admin/AdminConsole.tsx");
  assert.match(consoleSource, /response\.status === 502/);
  assert.match(consoleSource, /response\.status === 401/);
  assert.match(consoleSource, /response\.status === 403/);
  assert.match(consoleSource, /response\.status === 404/);
  assert.match(consoleSource, /reconcileInvitationState/);
  const catchBlock = consoleSource.match(/catch \{([\s\S]*?)\n\s*\} finally/)?.[1] ?? "";
  assert.doesNotMatch(catchBlock, /status: "invite_failed"/);
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
  assert.match(css, /\.filters button\s*\{[^}]*min-height:\s*44px/s);
  assert.match(consoleSource, /router\.push/);
  assert.match(consoleSource, /router\.replace/);
  assert.match(consoleSource, /aria-current=/);
  assert.match(consoleSource, /aria-pressed=/);
});
