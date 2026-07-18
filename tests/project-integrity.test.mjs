import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const readPolicy = (sql, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = sql.match(new RegExp(`create policy "${escaped}"[\\s\\S]*?;`, "i"));
  assert.ok(match, `Missing policy: ${name}`);
  return match[0];
};

const readExportedAction = (source, name) => {
  const signature = `export async function ${name}(`;
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `Missing Server Action: ${name}`);
  const next = source.indexOf("export async function ", start + signature.length);
  return source.slice(start, next === -1 ? source.length : next);
};

const assertActiveMemberAction = (source, name) => {
  const action = readExportedAction(source, name);
  const guard = action.indexOf("await requireActiveMemberForToken(accessToken)");
  assert.notEqual(guard, -1, `${name} must require active membership in its own body`);
  const privilegedWork = action.search(/process\.env\.(?:GEMINI|GROQ)_API_KEY|parseGlobalBulkData\(/);
  assert.notEqual(privilegedWork, -1, `${name} must expose a privileged-work boundary to test`);
  assert.ok(guard < privilegedWork, `${name} must authorize before privileged work`);
};

const readPolicyClause = (policy, keyword) => {
  const clause = policy.toLowerCase().indexOf(keyword.toLowerCase());
  assert.notEqual(clause, -1, `Missing ${keyword} clause`);
  const start = policy.indexOf("(", clause + keyword.length);
  assert.notEqual(start, -1, `Missing opening parenthesis for ${keyword}`);

  let depth = 0;
  let quoted = false;
  for (let index = start; index < policy.length; index += 1) {
    if (policy[index] === "'") {
      if (quoted && policy[index + 1] === "'") {
        index += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (policy[index] === "(") depth += 1;
    if (policy[index] === ")") {
      depth -= 1;
      if (depth === 0) return policy.slice(start + 1, index);
    }
  }
  assert.fail(`Unclosed ${keyword} clause`);
};

const ACTIVE_MEMBERSHIP = /member\.user_id\s*=\s*\(select auth\.uid\(\)\)[\s\S]*member\.status\s*=\s*'active'/i;
const ROW_OWNERSHIP = /\(select auth\.uid\(\)\)\s*=\s*user_id/i;
const PATH_OWNERSHIP = /\(storage\.foldername\(name\)\)\[1\]\s*=\s*\(select auth\.uid\(\)\)::text/i;

const assertMembershipClause = (clause, ownership, label) => {
  assert.match(clause, ownership, `${label} must preserve ownership`);
  assert.match(clause, ACTIVE_MEMBERSHIP, `${label} must require active membership`);
};

test("document queries consistently use the vault_documents table", () => {
  const files = [
    "src/components/VaultApp.tsx",
    "src/components/Dashboard.tsx",
    "src/components/DocumentVault.tsx",
    "src/components/GlobalSearch.tsx",
  ];

  for (const file of files) {
    assert.equal(read(file).includes("secure_documents"), false, `${file} still references secure_documents`);
  }
});

test("SQL setup covers all vault tables and update policies preserve ownership", () => {
  const sql = [
    "supabase_schema.sql",
    "documents_schema.sql",
    "notes_schema.sql",
    "vault_update_schema.sql",
  ].map(read).join("\n");

  assert.match(sql, /create table if not exists secure_wallet/i);
  assert.match(sql, /vault_documents[\s\S]*category text/i);
  assert.match(sql, /on vault_items for update[\s\S]*with check\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)/i);
  assert.match(sql, /on secure_notes for update[\s\S]*with check\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)/i);
  assert.match(sql, /on secure_wallet for update[\s\S]*with check\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)/i);
});

test("raw account password and master key are not persisted in localStorage", () => {
  const auth = read("src/components/Auth.tsx");
  const page = read("src/components/VaultApp.tsx");
  assert.equal(auth.includes("vault_password"), false);
  assert.equal(auth.includes("vault_master_key"), false);
  assert.equal(auth.includes("localStorage.setItem(\"vault_email\""), false);
  assert.equal(page.includes("sessionStorage.setItem"), false);
  assert.equal(page.includes("SESSION_MASTER_KEY"), false);
});

test("account deletion authenticates the caller, removes canonical request PII, and revokes refresh sessions", () => {
  const route = read("src/app/api/delete-account/route.ts");
  const inviteSchema = read("invite_access_schema.sql");
  assert.match(route, /authenticateRequest\(request\)/);
  assert.doesNotMatch(route, /authenticateActiveMemberRequest\(request\)/);
  assert.match(route, /admin\.auth\.admin\.signOut\(accessToken,\s*"global"\)/);
  assert.match(route, /collectPaginated/);
  assert.match(route, /chunkValues/);
  assert.match(route, /user\.email/);
  assert.match(route, /trim\(\)\.toLowerCase\(\)/);
  assert.match(route, /from\("access_requests"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("auth_user_id",\s*user\.id\)[\s\S]*\.eq\("email",\s*canonicalEmail\)/);
  assert.match(route, /admin\.auth\.admin\.deleteUser\(user\.id\)/);
  assert.ok(
    route.indexOf('from("access_requests")') < route.indexOf("admin.auth.admin.deleteUser(user.id)"),
    "request PII must be deleted before the Auth identity",
  );
  assert.doesNotMatch(route, /from\("access_requests"\)[\s\S]*\.or\(/);
  assert.match(route, /SUPABASE_SECRET_KEY\s*\?\?\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(inviteSchema, /user_id uuid primary key references auth\.users\(id\) on delete cascade/i);
  assert.match(inviteSchema, /access_request_id uuid unique references public\.access_requests\(id\) on delete set null/i);
  assert.match(inviteSchema, /access_request_id uuid references public\.access_requests\(id\) on delete set null/i);
  assert.match(inviteSchema, /member_user_id uuid references auth\.users\(id\) on delete set null/i);
});

test("scan requests are byte-bounded before JSON parsing", () => {
  const route = read("src/app/api/scan/route.ts");
  assert.match(route, /readBoundedJson\(req,\s*MAX_REQUEST_BYTES\)/);
  assert.doesNotMatch(route, /req\.json\(\)/);
});

test("all protected AI operations require an active member", () => {
  const actions = read("src/app/actions.ts");
  for (const name of [
    "analyzeImageName",
    "enrichPasswordMetadata",
    "categorizeDocument",
    "categorizeNote",
    "extractGlobalImportDrafts",
  ]) assertActiveMemberAction(actions, name);
  assert.doesNotMatch(actions, /requireAuthenticatedUser/);

  const duplicateGuardFixture = `
    export async function analyzeImageName(accessToken) {
      await requireActiveMemberForToken(accessToken);
      await requireActiveMemberForToken(accessToken);
      process.env.GEMINI_API_KEY;
    }
    export async function enrichPasswordMetadata(accessToken) {
      process.env.GROQ_API_KEY;
    }
  `;
  assert.throws(
    () => assertActiveMemberAction(duplicateGuardFixture, "enrichPasswordMetadata"),
    /must require active membership in its own body/,
  );

  const scan = read("src/app/api/scan/route.ts");
  assert.match(scan, /authenticateActiveMemberRequest\(req\)/);
  assert.doesNotMatch(scan, /authenticateRequest\(req\)/);

  const auth = read("src/lib/server/auth.ts");
  assert.match(auth, /export async function authenticateActiveMemberRequest/);
  assert.match(auth, /requireActiveMemberForToken\(token\)/);
});

test("the Magic Import paste-to-extract flow is metered like every other AI action", () => {
  const actions = read("src/app/actions.ts");
  const action = readExportedAction(actions, "extractGlobalImportDrafts");

  const creditIndex = action.indexOf('await consumeAiCredit(userId, "import")');
  const workIndex = action.indexOf("parseGlobalBulkData(");
  assert.notEqual(creditIndex, -1, "extractGlobalImportDrafts must consume an AI credit for kind 'import'");
  assert.notEqual(workIndex, -1, "extractGlobalImportDrafts must call parseGlobalBulkData");
  assert.ok(creditIndex < workIndex, "extractGlobalImportDrafts must meter before doing the AI work");
  assert.match(action, /AiLimitReachedError/);
  assert.doesNotMatch(actions, /export (?:async )?function parseNotesToPasswords|export (?:async )?function parseBulkNotes/);

  const aiUsage = read("src/lib/server/aiUsage.ts");
  assert.match(aiUsage, /"scan" \| "document_name" \| "categorize" \| "import"/);

  const migrationName = readdirSync(new URL("../supabase/migrations", import.meta.url), { withFileTypes: true })
    .find((entry) => entry.isFile() && entry.name.endsWith("_meter_global_import.sql"))?.name;
  assert.ok(migrationName, "meter_global_import migration must be generated by the Supabase CLI");
  const migration = read(`supabase/migrations/${migrationName}`);
  assert.match(migration, /check \(kind in \('scan', 'document_name', 'categorize', 'import'\)\)/);
  assert.match(migration, /p_kind not in \('scan', 'document_name', 'categorize', 'import'\)/);
});

test("vault and storage RLS policies combine ownership with active membership", () => {
  const sql = read("invite_access_schema.sql");
  const tablePolicies = {
    "vault items": ["Users can view their own vault items", "Users can insert their own vault items", "Users can update their own vault items", "Users can delete their own vault items"],
    documents: ["Users can view their own documents", "Users can insert their own documents", "Users can update their own documents", "Users can delete their own documents"],
    "secure notes": ["Users can view their own secure notes", "Users can insert their own secure notes", "Users can update their own secure notes", "Users can delete their own secure notes"],
    wallet: ["Users can view their own wallet items", "Users can insert their own wallet items", "Users can update their own wallet items", "Users can delete their own wallet items"],
  };

  for (const names of Object.values(tablePolicies)) {
    for (const name of names) {
      const policy = readPolicy(sql, name);
      if (/update/i.test(name)) {
        assertMembershipClause(readPolicyClause(policy, "using"), ROW_OWNERSHIP, `${name} USING`);
        assertMembershipClause(readPolicyClause(policy, "with check"), ROW_OWNERSHIP, `${name} WITH CHECK`);
      } else {
        assertMembershipClause(policy, ROW_OWNERSHIP, name);
      }
    }
  }

  for (const name of [
    "Users can upload their own document files",
    "Users can update their own document files",
    "Users can delete their own document files",
    "Users can upload their own avatars",
    "Users can update their own avatars",
    "Users can delete their own avatars",
  ]) {
    const policy = readPolicy(sql, name);
    if (/update/i.test(name)) {
      assertMembershipClause(readPolicyClause(policy, "using"), PATH_OWNERSHIP, `${name} USING`);
      assertMembershipClause(readPolicyClause(policy, "with check"), PATH_OWNERSHIP, `${name} WITH CHECK`);
    } else {
      assertMembershipClause(policy, PATH_OWNERSHIP, name);
    }
  }

  const missingWithCheckMembership = `
    create policy "fixture" on public.vault_items for update to authenticated
    using (
      (select auth.uid()) = user_id and exists (
        select 1 from public.app_members member
        where member.user_id = (select auth.uid()) and member.status = 'active'
      )
    )
    with check ((select auth.uid()) = user_id);
  `;
  assert.throws(
    () => assertMembershipClause(readPolicyClause(missingWithCheckMembership, "with check"), ROW_OWNERSHIP, "fixture WITH CHECK"),
    /must require active membership/,
  );
});

test("client crypto does not depend on Node Buffer", () => {
  assert.equal(read("src/lib/crypto.ts").includes("Buffer."), false);
});

test("payment cards use one proportional network-logo source of truth", () => {
  const logos = read("src/components/CardLogos.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  assert.match(logos, /export type CardNetwork/);
  assert.match(logos, /export function getCardNetwork/);
  assert.match(logos, /export function CardNetworkLogo/);
  assert.match(logos, /object-contain/);
  assert.match(logos, /mastercard/i);
  assert.equal(wallet.includes("VisaLogo, RuPayLogo"), false);
});

test("Apple visual primitives include safe areas, focus, and reduced motion", () => {
  const css = read("src/app/globals.css");
  for (const token of ["--system-blue", "--grouped-bg", "--elevated-bg", "--separator", "--apple-shadow"]) {
    assert.match(css, new RegExp(token));
  }
  for (const klass of ["apple-material", "apple-group", "apple-control", "apple-sheet", "apple-tabbar"]) {
    assert.match(css, new RegExp(`\\.${klass}`));
  }
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*44px/);
});

test("mobile shell keeps iOS-style safe areas and native tab treatment", () => {
  const page = read("src/components/VaultApp.tsx");
  const css = read("src/app/globals.css");

  assert.match(page, /ios-app-shell/);
  assert.match(page, /vault-header/);
  assert.match(page, /apple-tabbar/);
  assert.match(page, /layoutId="mobile-bg"/);
  assert.match(page, /max-w-6xl/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /--bottom-bar-height:\s*82px/);
  assert.match(css, /@media \(max-width:\s*767px\)/);
});

test("mobile vault uses a solid white light-mode canvas", () => {
  const css = read("src/app/globals.css");
  const mobileShellStart = css.indexOf("@media (max-width: 767px) {", css.indexOf(".ios-mobile-tabbar"));
  const mobileShellEnd = css.indexOf("\n}\n\n@media (prefers-reduced-motion", mobileShellStart) + 2;
  const mobileShellCss = css.slice(mobileShellStart, mobileShellEnd);

  assert.ok(mobileShellStart >= 0 && mobileShellEnd > mobileShellStart);
  assert.match(mobileShellCss, /:root\s*\{[^}]*--background:\s*#F2F2F7;/);
  assert.match(mobileShellCss, /\.ios-app-shell\s*\{[^}]*--background:\s*#FFFFFF;/);
  assert.match(mobileShellCss, /\.dark \.ios-app-shell\s*\{[^}]*--background:\s*#000000;/);
  assert.match(mobileShellCss, /\.ios-content-scroll\s*\{[^}]*background:\s*var\(--background\);/);
});

test("responsive shell uses the shared Apple ecosystem chrome", () => {
  const page = read("src/components/VaultApp.tsx");
  for (const klass of ["apple-app", "apple-sidebar", "vault-header", "vault-header-search", "apple-tabbar"]) {
    assert.match(page, new RegExp(klass));
  }
  assert.match(page, /aria-label="Primary navigation"/);
});

test("adaptive header separates desktop search and mobile actions", () => {
  const page = read("src/components/VaultApp.tsx");
  const css = read("src/app/globals.css");

  for (const klass of ["vault-header", "vault-header-title", "vault-header-search", "vault-header-actions", "vault-header-mobile-search"]) {
    assert.match(page, new RegExp(klass));
  }
  assert.match(page, /vault-header-theme/);
  assert.match(css, /\.vault-header\s*\{[^}]*grid-template-columns:\s*1fr minmax\(280px,420px\) 1fr/s);
  assert.match(css, /@media \(max-width:\s*767px\)[\s\S]*?\.vault-header\s*\{[^}]*safe-area-inset-top/s);
});

test("passwords use sibling master detail and an accessible mobile sheet", () => {
  const passwords = read("src/components/PasswordVault.tsx");
  assert.match(passwords, /data-password-master/);
  assert.ok(passwords.lastIndexOf("renderPasswordDetail(selectedItem)") > passwords.indexOf("data-password-master"));
  assert.match(passwords, /role="dialog"/);
  assert.match(passwords, /aria-modal="true"/);
  assert.match(passwords, /aria-label="Close password details"/);
  assert.match(passwords, /e\.key === "Escape"/);
  assert.match(passwords, /EyeIcon/);
  assert.match(passwords, /CopyIcon/);
});

test("wallet presentation is isolated in an accessible PaymentCard", () => {
  assert.equal(existsSync(new URL("../src/components/PaymentCard.tsx", import.meta.url)), true);
  const card = read("src/components/PaymentCard.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  assert.match(card, /export interface PaymentCardProps/);
  assert.match(card, /export function PaymentCard/);
  assert.match(card, /CardNetworkLogo/);
  assert.match(card, /aria-current/);
  assert.match(card, /wallet-card-number/);
  assert.match(wallet, /<PaymentCard/);
});

test("native Apple primitives cover lists, selection, and tactile states", () => {
  assert.equal(existsSync(new URL("../src/components/SelectionToolbar.tsx", import.meta.url)), true, "src/components/SelectionToolbar.tsx is missing");
  const selection = read("src/components/SelectionToolbar.tsx");
  const css = read("src/app/globals.css");
  assert.match(selection, /SelectionToolbar/);
  assert.match(selection, /"vibrate" in navigator/);
  for (const klass of ["apple-grouped-list", "apple-selection-toolbar", "apple-pressed", "type-large-title", "type-section-title", "type-row-title", "type-supporting", "type-metadata", "type-group-label"]) assert.match(css, new RegExp(`\\.${klass}`));
});

test("Wallet workspace and Settings expose native structure", () => {
  const card = read("src/components/PaymentCard.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  const settings = read("src/components/settings/Settings.tsx") + read("src/components/settings/settings-types.ts");
  const css = read("src/app/globals.css");
  assert.match(card, /selected: boolean/);
  assert.match(wallet, /wallet-workspace/);
  assert.match(css, /\.wallet-card-wrap\[data-selected\]/);
  assert.match(css, /--apple-spring/);
  for (const label of ["Account", "Security", "Appearance", "Data & Backup", "Danger Zone"]) assert.match(settings, new RegExp(label));
});

test("global importer has paste review saving and truthful result stages", () => {
  const importer = read("src/components/GlobalMagicImport.tsx");
  assert.match(importer, /type State/);
  for (const phase of ["source", "analyzing", "review", "saving", "results"]) assert.match(importer, new RegExp(`"${phase}"`));
  assert.match(importer, /Review import/);
  assert.match(importer, /saveImportDrafts/);
  assert.match(importer, /classifyDuplicates/);
  assert.match(importer, /failures/);
});

test("Digital Wallet uses one filterable card stack", () => {
  const wallet = read("src/components/WalletVault.tsx");
  const card = read("src/components/PaymentCard.tsx");
  const css = read("src/app/globals.css");
  assert.match(wallet, /type WalletFilter/);
  assert.match(wallet, /walletFilter/);
  assert.match(wallet, /"All".*"Credit".*"Debit"/s);
  assert.match(wallet, /className="wallet-workspace"/);
  assert.match(wallet, /className="wallet-deck"/);
  assert.match(card, /wallet-card-top/);
  assert.match(card, /wallet-card-bottom/);
  assert.match(card, /onClick=\{selectionMode \? onToggleChecked : onActivate\}/);
  assert.match(wallet, /wallet-inspector/);
  assert.match(wallet, /wallet-mobile-sheet md:hidden/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.wallet-workspace\s*\{[^}]*display:\s*block/s);
});

test("Bank Vault uses compact grouped institution rows", () => {
  const bank = read("src/components/BankVault.tsx");
  assert.match(bank, /apple-bank-list/);
  assert.match(bank, /apple-bank-list apple-master-list/);
  assert.match(bank, /Account suffix/);
  assert.match(bank, /IFSC \/ Routing/);
  assert.match(bank, /ChevronRightIcon/);
});

test("Bank Vault renders selected account in an accessible sibling detail surface", () => {
  const bank = read("src/components/BankVault.tsx");
  assert.match(bank, /const selectedBank =/);
  assert.match(bank, /apple-bank-master-detail/);
  assert.match(bank, /role="dialog"/);
  assert.match(bank, /role="dialog"/);
  assert.match(bank, /aria-label="Close account details"/);
  assert.match(bank, /Account Holder/);
  assert.match(bank, /Account Type/);
  assert.match(bank, /aria-label={`Copy/);
  assert.equal(bank.includes("apple-mobile-detail-sheet space-y-4 relative z-10 mt-5"), false);
});

test("reset password keeps the server shell above a focused client leaf", () => {
  const clientPath = new URL("../src/components/auth/ResetPasswordClient.tsx", import.meta.url);
  assert.equal(existsSync(clientPath), true, "ResetPasswordClient.tsx must contain the interactive reset flow");

  const page = read("src/app/reset-password/page.tsx");
  const client = read("src/components/auth/ResetPasswordClient.tsx");
  assert.doesNotMatch(page, /^"use client"/);
  assert.match(page, /<PublicPageShell>[\s\S]*<ResetPasswordClient\s*\/>[\s\S]*<\/PublicPageShell>/);
  assert.match(client, /^"use client"/);
  assert.doesNotMatch(client, /@\/lib\/server\//);
});

test("Bank Vault locks desktop master and detail into a compact two-column workspace", () => {
  const bank = read("src/components/BankVault.tsx");
  assert.match(bank, /apple-bank-workspace grid w-full items-start/);
  assert.match(bank, /md:grid-cols-\[minmax\(280px,0\.82fr\)_minmax\(360px,1\.18fr\)\]/);
  assert.match(bank, /apple-bank-detail-fields/);
  assert.doesNotMatch(bank, /selectedBank\.payload\.name \|\| "Not provided"/);
  assert.doesNotMatch(bank, /accountType \|\| "Bank account"/);
});

test("desktop master-detail starts at the same breakpoint as the desktop sidebar", () => {
  const css = read("src/app/globals.css");
  const page = read("src/components/VaultApp.tsx");
  const settings = read("src/components/settings/Settings.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  assert.match(css, /@media \(min-width:\s*768px\)[\s\S]*?\.apple-bank-master-detail\s*\{[^}]*grid-template-columns/);
  assert.match(css, /@media \(min-width:\s*768px\)[\s\S]*?\.wallet-workspace\s*\{[^}]*grid-template-columns/);
  assert.doesNotMatch(css, /\.apple-detail-pane\s*>\s*div\s*\{/);
  assert.match(page, /max-w-6xl/);
  assert.match(page, /contentScrollRef\.current\?\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
  assert.match(settings, /settings-layout/);
  assert.doesNotMatch(wallet, /apple-wallet-stack[^\n]*lg:grid-cols-2/);
  assert.match(wallet, /className="wallet-workspace"/);
  assert.match(wallet, /className="wallet-mobile-sheet md:hidden"/);
});

test("mobile password and bank lists fill the shell content width", () => {
  const css = read("src/app/globals.css");
  const page = read("src/components/VaultApp.tsx");

  assert.match(page, /max-w-6xl mx-auto w-full px-4/);
  assert.match(
    css,
    /@media \(max-width:\s*767px\)[\s\S]*?\.apple-password-master-detail,\s*\.apple-bank-master-detail\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(
    css,
    /\.apple-password-master-detail \.apple-password-list,\s*\.apple-bank-master-detail \.apple-bank-list\s*\{[^}]*width:\s*100%[^}]*max-width:\s*none[^}]*margin:\s*0/,
  );
});

test("Passwords and Bank Vault adopt adaptive master-detail surfaces", () => {
  const passwords = read("src/components/PasswordVault.tsx");
  const bank = read("src/components/BankVault.tsx");
  const css = read("src/app/globals.css");

  for (const source of [passwords, bank]) {
    assert.match(source, /apple-master-detail/);
    assert.match(source, /apple-master-list/);
    assert.match(source, /apple-detail-pane/);
  }
  assert.match(passwords, /className="apple-password-detail apple-detail-pane/);
  assert.match(passwords, /className="apple-password-detail-backdrop"/);
  assert.match(passwords, /y: "100%"/);
  assert.match(bank, /apple-bank-detail/);

  assert.match(css, /\.apple-master-detail/);
  assert.match(css, /\.apple-detail-row/);
});

test("Profile uses a compact Apple Settings hierarchy", () => {
  const settings = read("src/components/settings/Settings.tsx");
  const navigation = read("src/components/settings/settings-types.ts");
  assert.match(settings, /settings-layout/);
  for (const section of ["account", "security", "appearance", "backup", "danger"]) {
    assert.match(navigation, new RegExp(`id: "${section}"`));
  }
  assert.match(settings, /DangerSettings/);
});
