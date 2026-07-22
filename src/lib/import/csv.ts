import Papa from "papaparse";
import { createImportDraft } from "@/lib/import/normalize";
import type { ImportDraft } from "@/lib/import/types";

type CsvRow = Record<string, string>;
const aliases = {
  title: ["title", "name"], domain: ["url", "website", "origin"], username: ["username", "login_username", "login"], password: ["password", "login_password"],
  content: ["content", "note", "notes"], account: ["account", "account_number"], routing: ["routing", "routing_number", "ifsc", "swift"],
  number: ["number", "card_number"], expiry: ["expiry", "expiration"], cvv: ["cvv", "cvc"], holder: ["holder", "cardholder", "account_holder"],
};

function normalizedRow(row: CsvRow) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value ?? "").trim()]));
}

function pick(row: CsvRow, keys: string[]) {
  for (const key of keys) if (row[key]) return row[key];
  return "";
}

export async function parseImportCsv(file: File): Promise<{ drafts: ImportDraft[]; errors: string[] }> {
  const parsed = Papa.parse<CsvRow>(await file.text(), { header: true, skipEmptyLines: "greedy", transformHeader: (header) => header.trim().toLowerCase() });
  const errors = parsed.errors.map((error) => `Row ${(error.row ?? 0) + 2}: ${error.message}`);

  if (parsed.data.length === 0) {
    return { drafts: [], errors: [...errors, "No rows were found in this file."] };
  }

  let recognizedRows = 0;
  const drafts = parsed.data.map(normalizedRow).map((row, index) => {
    const source = `${file.name} · row ${index + 2}`;
    const title = pick(row, aliases.title) || pick(row, aliases.domain) || `Imported item ${index + 1}`;
    const hasLoginSignal = Boolean(pick(row, aliases.password) || pick(row, aliases.username) || pick(row, aliases.domain));
    const hasCardSignal = Boolean(pick(row, aliases.number) || pick(row, aliases.expiry));
    const hasBankSignal = Boolean(pick(row, aliases.account) || pick(row, aliases.routing));
    const hasNoteSignal = Boolean(pick(row, aliases.content) || pick(row, aliases.title));
    if (hasLoginSignal || hasCardSignal || hasBankSignal || hasNoteSignal) recognizedRows++;

    // Browser password exports are login-shaped rows; only classify as a
    // password when the row actually looks like one (has a domain, username,
    // or password), so a stray non-login row some browsers mix in - a note
    // or payment entry - isn't misfiled as a password with a missing field.
    if (hasLoginSignal) {
      return createImportDraft("password", title, { domain: pick(row, aliases.domain), username: pick(row, aliases.username), password: pick(row, aliases.password), notes: pick(row, aliases.content), category: "Imported" }, source);
    }
    if (hasCardSignal) {
      return createImportDraft("card", title, { number: pick(row, aliases.number), expiry: pick(row, aliases.expiry), cvv: pick(row, aliases.cvv), name: pick(row, aliases.holder), pin: "", upi_pin: "", extra_details: pick(row, aliases.content) }, source);
    }
    if (hasBankSignal) {
      return createImportDraft("bank_account", title, { account: pick(row, aliases.account), routing: pick(row, aliases.routing), name: pick(row, aliases.holder), extra_details: pick(row, aliases.content) }, source);
    }
    return createImportDraft("note", title, { content: pick(row, aliases.content), category: "Imported" }, source);
  });

  if (recognizedRows === 0) {
    return { drafts: [], errors: [...errors, "This file doesn't look like a supported export - no recognizable columns (title, url, username, password, account, card, or note fields) were found."] };
  }

  return { drafts, errors };
}
