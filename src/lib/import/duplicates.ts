import type { ImportDraft, ImportItemType } from "@/lib/import/types";

export interface ExistingImportItem {
  id: string;
  type: ImportItemType;
  title: string;
  fields: Record<string, string>;
}

function normalize(value: string | undefined) {
  return (value ?? "").normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function lastFour(value: string | undefined) {
  return (value ?? "").replace(/\D/g, "").slice(-4);
}

function duplicateKey(item: Pick<ExistingImportItem, "type" | "title" | "fields">) {
  const title = normalize(item.title);
  if (item.type === "password") return [item.type, title, normalize(item.fields.domain), normalize(item.fields.username)].join("|");
  if (item.type === "note") return [item.type, title].join("|");
  if (item.type === "bank_account") return [item.type, title, lastFour(item.fields.account)].join("|");
  if (item.type === "card") return [item.type, title, lastFour(item.fields.number)].join("|");
  if (item.type === "ssh_key") return [item.type, title, normalize(item.fields.host)].join("|");
  if (item.type === "crypto_wallet") return [item.type, title, normalize(item.fields.walletAddress)].join("|");
  if (item.type === "api_credential") return [item.type, title, normalize(item.fields.serviceName), normalize(item.fields.apiKey)].join("|");
  if (item.type === "wifi_credential") return [item.type, title, normalize(item.fields.networkName)].join("|");
  return [item.type, title, normalize(item.fields.serviceName)].join("|"); // two_factor_backup
}

export function classifyDuplicates(drafts: ImportDraft[], existingItems: ExistingImportItem[]): ImportDraft[] {
  const existingByKey = new Map(existingItems.map((item) => [duplicateKey(item), item]));
  return drafts.map((draft) => {
    const match = existingByKey.get(duplicateKey(draft));
    return {
      ...draft,
      duplicate: match ? { matchId: match.id, label: match.title } : null,
      duplicateResolution: match ? "unresolved" : "keep_both",
    };
  });
}
