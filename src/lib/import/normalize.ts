import type { Confidence, GlobalImportResult, ImportDraft, ImportItemType } from "@/lib/import/types";
import { withValidation } from "@/lib/import/validation";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

function confidence(fields: Record<string, string>): Record<string, Confidence> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value ? "high" : "low"])) as Record<string, Confidence>;
}

export function createImportDraft(type: ImportItemType, title: string, fields: Record<string, string>, sourceLabel: string): ImportDraft {
  return withValidation({
    clientId: crypto.randomUUID(),
    type,
    title: title.trim(),
    fields,
    confidence: confidence(fields),
    included: true,
    sourceLabel,
    issues: [],
    duplicate: null,
    duplicateResolution: "unresolved",
  });
}

export function normalizeImportResult(result: GlobalImportResult, sourceLabel: string): ImportDraft[] {
  return [
    ...result.passwords.map((item) => createImportDraft("password", text(item.title), { domain: text(item.url), username: text(item.username), password: text(item.password), notes: text(item.extra_details), category: text(item.category) || "Uncategorized" }, sourceLabel)),
    ...result.notes.map((item) => createImportDraft("note", text(item.title), { content: text(item.content), category: text(item.category) || "Uncategorized" }, sourceLabel)),
    ...result.bank_accounts.map((item) => createImportDraft("bank_account", text(item.title), { account: text(item.account), routing: text(item.routing), name: text(item.name), extra_details: text(item.extra_details) }, sourceLabel)),
    ...result.credit_cards.map((item) => createImportDraft("card", text(item.title), { number: text(item.number), expiry: text(item.expiry), cvv: text(item.cvv), name: text(item.name), pin: text(item.pin), upi_pin: text(item.upi_pin), extra_details: text(item.extra_details) }, sourceLabel)),
    ...result.ssh_keys.map((item) => createImportDraft("ssh_key", text(item.title), { privateKey: text(item.privateKey), publicKey: text(item.publicKey), host: text(item.host), passphrase: text(item.passphrase), notes: text(item.notes) }, sourceLabel)),
    ...result.crypto_wallets.map((item) => createImportDraft("crypto_wallet", text(item.title), { seedPhrase: text(item.seedPhrase), walletAddress: text(item.walletAddress), notes: text(item.notes) }, sourceLabel)),
    ...result.api_credentials.map((item) => createImportDraft("api_credential", text(item.title), { serviceName: text(item.serviceName), apiKey: text(item.apiKey), apiSecret: text(item.apiSecret), notes: text(item.notes) }, sourceLabel)),
    ...result.wifi_credentials.map((item) => createImportDraft("wifi_credential", text(item.title), { networkName: text(item.networkName), password: text(item.password), notes: text(item.notes) }, sourceLabel)),
    ...result.two_factor_backups.map((item) => createImportDraft("two_factor_backup", text(item.title), { serviceName: text(item.serviceName), codes: text(item.codes), notes: text(item.notes) }, sourceLabel)),
  ];
}

export function isGlobalImportResult(value: unknown): value is GlobalImportResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GlobalImportResult>;
  return [
    candidate.passwords, candidate.notes, candidate.bank_accounts, candidate.credit_cards,
    candidate.ssh_keys, candidate.crypto_wallets, candidate.api_credentials, candidate.wifi_credentials, candidate.two_factor_backups,
  ].every(Array.isArray);
}
