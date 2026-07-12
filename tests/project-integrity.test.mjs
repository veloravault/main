import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("document queries consistently use the vault_documents table", () => {
  const files = [
    "src/app/page.tsx",
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
  assert.equal(auth.includes("vault_password"), false);
  assert.equal(auth.includes("vault_master_key"), false);
  assert.equal(auth.includes("localStorage.setItem(\"vault_email\""), false);
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
  const page = read("src/app/page.tsx");
  const css = read("src/app/globals.css");

  assert.match(page, /ios-app-shell/);
  assert.match(page, /ios-mobile-header/);
  assert.match(page, /apple-tabbar/);
  assert.match(page, /layoutId="mobile-bg"/);
  assert.match(page, /max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-7/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /--bottom-bar-height:\s*82px/);
  assert.match(css, /@media \(max-width:\s*767px\)/);
});

test("responsive shell uses the shared Apple ecosystem chrome", () => {
  const page = read("src/app/page.tsx");
  for (const klass of ["apple-app", "apple-sidebar", "apple-toolbar", "apple-large-title", "apple-tabbar"]) {
    assert.match(page, new RegExp(klass));
  }
  assert.match(page, /aria-label="Primary navigation"/);
});

test("adaptive header separates desktop search and mobile actions", () => {
  const page = read("src/app/page.tsx");
  const css = read("src/app/globals.css");

  for (const klass of ["apple-adaptive-header", "apple-header-title", "apple-header-search", "apple-header-actions", "apple-mobile-identity"]) {
    assert.match(page, new RegExp(klass));
  }
  assert.match(page, /apple-theme-toggle[^\n]*hidden[^\n]*md:flex/);
  assert.match(css, /\.apple-header-search\s*\{[^}]*position:\s*absolute[^}]*left:\s*50%/s);
  assert.match(css, /\.apple-adaptive-header\s*\{[^}]*padding-top:\s*env\(safe-area-inset-top/s);
});

test("passwords use sibling master detail and an accessible mobile sheet", () => {
  const passwords = read("src/components/PasswordVault.tsx");
  assert.match(passwords, /data-password-master/);
  assert.match(passwords, /data-password-detail/);
  assert.ok(passwords.lastIndexOf("renderPasswordDetail(selectedItem)") > passwords.indexOf("data-password-master"));
  assert.match(passwords, /role="dialog"/);
  assert.match(passwords, /aria-modal="true"/);
  assert.match(passwords, /aria-label="Close password details"/);
  assert.match(passwords, /e\.key === "Escape"/);
  assert.match(passwords, /EyeIcon/);
  assert.match(passwords, /ExternalLinkIcon/);
});

test("wallet presentation is isolated in an accessible PaymentCard", () => {
  assert.equal(existsSync(new URL("../src/components/PaymentCard.tsx", import.meta.url)), true);
  const card = read("src/components/PaymentCard.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  assert.match(card, /export interface PaymentCardProps/);
  assert.match(card, /export function PaymentCard/);
  assert.match(card, /CardNetworkLogo/);
  assert.match(card, /aria-expanded/);
  assert.match(card, /tabular-nums/);
  assert.match(wallet, /<PaymentCard/);
});

test("native Apple primitives cover lists, sheets, selection, and tactile states", () => {
  for (const file of [
    "src/components/ui/apple-grouped-list.tsx",
    "src/components/ui/responsive-sheet-frame.tsx",
    "src/components/SelectionToolbar.tsx",
  ]) assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), true, `${file} is missing`);
  const list = read("src/components/ui/apple-grouped-list.tsx");
  const sheet = read("src/components/ui/responsive-sheet-frame.tsx");
  const selection = read("src/components/SelectionToolbar.tsx");
  const css = read("src/app/globals.css");
  assert.match(list, /AppleGroupedList/);
  assert.match(list, /AppleGroupedRow/);
  assert.match(list, /AppleGroupLabel/);
  assert.match(sheet, /ResponsiveSheetFrame/);
  assert.match(selection, /SelectionToolbar/);
  assert.match(selection, /"vibrate" in navigator/);
  for (const klass of ["apple-grouped-list", "apple-grouped-row", "apple-bottom-sheet", "apple-selection-toolbar", "apple-pressed", "type-large-title", "type-section-title", "type-row-title", "type-supporting", "type-metadata", "type-group-label"]) assert.match(css, new RegExp(`\\.${klass}`));
});

test("Wallet stack and Settings profile expose native structure", () => {
  const card = read("src/components/PaymentCard.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  const profile = read("src/components/Profile.tsx");
  const css = read("src/app/globals.css");
  assert.match(card, /stacked: boolean/);
  assert.match(card, /active: boolean/);
  assert.match(wallet, /apple-wallet-stack/);
  assert.match(css, /\.apple-wallet-card-active/);
  assert.match(css, /--apple-spring/);
  for (const label of ["Account", "Security", "Appearance", "Data", "Danger Zone"]) assert.match(profile, new RegExp(label));
});

test("global importer has paste review saving and truthful result stages", () => {
  const importer = read("src/components/GlobalMagicImport.tsx");
  assert.match(importer, /type ImportPhase/);
  for (const phase of ["paste", "review", "saving", "done"]) assert.match(importer, new RegExp(`"${phase}"`));
  assert.match(importer, /Review Import/);
  assert.match(importer, /Save.*Items/);
  assert.match(importer, /selected/);
  assert.match(importer, /excluded/);
  assert.match(importer, /failed/);
});

test("Digital Wallet uses one filterable card stack", () => {
  const wallet = read("src/components/WalletVault.tsx");
  const card = read("src/components/PaymentCard.tsx");
  const css = read("src/app/globals.css");
  assert.match(wallet, /type WalletFilter/);
  assert.match(wallet, /walletFilter/);
  assert.match(wallet, /"All".*"Credit".*"Debit"/s);
  assert.equal((wallet.match(/apple-wallet-stack/g) || []).length, 1);
  assert.match(wallet, /!expandedCardId\s*&&\s*cards\.indexOf\(item\)\s*===\s*cards\.length\s*-\s*1/);
  assert.match(card, /apple-wallet-card-header/);
  assert.match(card, /apple-wallet-card-body/);
  assert.match(card, /onClick=\{selectionMode \? onSelect : onToggle\}/);
  assert.match(card, /hasDetails\s*&&/);
  assert.match(wallet, /apple-wallet-master-detail/);
  assert.match(wallet, /apple-wallet-detail-pane/);
  assert.match(wallet, /Delete Card/);
  assert.match(css, /\.apple-wallet-card-stacked:not\(\.apple-wallet-card-active\)[^{]*\{[^}]*height:\s*76px[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.apple-wallet-card-stacked:not\(\.apple-wallet-card-active\)[^{]*\.apple-wallet-card-body\s*\{[^}]*display:\s*none/s);
});

test("Bank Vault uses compact grouped institution rows", () => {
  const bank = read("src/components/BankVault.tsx");
  assert.match(bank, /apple-bank-list/);
  assert.match(bank, /apple-bank-row/);
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
  const page = read("src/app/page.tsx");
  const profile = read("src/components/Profile.tsx");
  const wallet = read("src/components/WalletVault.tsx");
  assert.match(css, /@media \(min-width:\s*768px\)[\s\S]*?\.apple-bank-master-detail\s*\{[^}]*grid-template-columns/);
  assert.match(css, /@media \(min-width:\s*768px\)[\s\S]*?\.apple-wallet-master-detail\s*\{[^}]*grid-template-columns/);
  assert.doesNotMatch(css, /\.apple-detail-pane\s*>\s*div\s*\{/);
  assert.match(page, /max-w-6xl/);
  assert.match(page, /contentScrollRef\.current\?\.scrollTo\(\{ top: 0, behavior: "auto" \}\)/);
  assert.match(profile, /md:grid-cols-2/);
  assert.doesNotMatch(wallet, /apple-wallet-stack[^\n]*lg:grid-cols-2/);
  assert.match(wallet, /apple-wallet-detail-backdrop/);
  assert.match(wallet, /expandedCardId \? "block" : "hidden md:block"/);
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
  assert.match(passwords, /apple-mobile-detail-sheet/);
  assert.match(bank, /apple-bank-detail/);

  assert.match(css, /\.apple-master-detail/);
  assert.match(css, /\.apple-detail-row/);
});

test("Profile uses a compact Apple Settings hierarchy", () => {
  const profile = read("src/components/Profile.tsx");
  assert.match(profile, /apple-settings-layout/);
  for (const section of ["account", "security", "appearance", "data", "danger"]) {
    assert.match(profile, new RegExp(`data-settings-section="${section}"`));
  }
  assert.equal((profile.match(/>Danger Zone</g) || []).length, 1);
});
