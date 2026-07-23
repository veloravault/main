import type { ImportDraft, ImportItemType } from "@/lib/import/types";

const requiredFields: Record<ImportItemType, string[]> = {
  password: ["password"],
  note: ["content"],
  bank_account: ["account"],
  card: ["number"],
  ssh_key: ["privateKey"],
  crypto_wallet: ["seedPhrase"],
  api_credential: ["apiKey"],
  wifi_credential: ["networkName", "password"],
  two_factor_backup: ["codes"],
};

export function validateDraft(draft: ImportDraft): string[] {
  const issues: string[] = [];
  if (!draft.title.trim()) issues.push("Add a title.");
  for (const field of requiredFields[draft.type]) {
    if (!draft.fields[field]?.trim()) issues.push(`Add ${field.replaceAll("_", " ")}.`);
  }
  if (draft.type === "card" && draft.fields.number && draft.fields.number.replace(/\D/g, "").length < 12) issues.push("Card number appears incomplete.");
  if (draft.type === "bank_account" && draft.fields.account && draft.fields.account.replace(/\s/g, "").length < 4) issues.push("Account number appears incomplete.");
  return issues;
}

export function withValidation(draft: ImportDraft): ImportDraft {
  return { ...draft, issues: validateDraft(draft) };
}
