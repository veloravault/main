export type ImportItemType = "password" | "note" | "bank_account" | "card";
export type Confidence = "high" | "medium" | "low";
export type DuplicateResolution = "unresolved" | "skip" | "keep_both" | "replace";

export interface ImportDraft {
  clientId: string;
  type: ImportItemType;
  title: string;
  fields: Record<string, string>;
  confidence: Record<string, Confidence>;
  included: boolean;
  sourceLabel: string;
  issues: string[];
  duplicate: { matchId: string; label: string } | null;
  duplicateResolution: DuplicateResolution;
}

export type ImportSource =
  | { kind: "paste"; text: string }
  | { kind: "csv" | "browser_csv"; file: File }
  | { kind: "image"; file: File };

export type ImportExtractionResponse =
  | { ok: true; drafts: ImportDraft[] }
  | { ok: false; code: "UNSUPPORTED" | "INVALID_INPUT" | "EXTRACTION_FAILED" | "AI_LIMIT_REACHED"; message: string };

export interface GlobalImportPassword { title?: string; url?: string; username?: string; password?: string; extra_details?: string; category?: string; }
export interface GlobalImportNote { title?: string; content?: string; category?: string; }
export interface GlobalImportBank { title?: string; account?: string; routing?: string; name?: string; extra_details?: string; }
export interface GlobalImportCard { title?: string; number?: string; expiry?: string; cvv?: string; name?: string; pin?: string; upi_pin?: string; extra_details?: string; }

export interface GlobalImportResult {
  passwords: GlobalImportPassword[];
  notes: GlobalImportNote[];
  bank_accounts: GlobalImportBank[];
  credit_cards: GlobalImportCard[];
}
