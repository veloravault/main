"use server";

import { GoogleGenAI } from "@google/genai";
import type { GlobalImportResult, ImportExtractionResponse } from "@/lib/import/types";
import { isGlobalImportResult, normalizeImportResult } from "@/lib/import/normalize";
import { requireActiveMemberForToken } from "@/lib/server/access";
import { AiLimitReachedError, consumeAiCredit } from "@/lib/server/aiUsage";

export type { GlobalImportResult } from "@/lib/import/types";

const MAX_TEXT_INPUT = 200_000;
const MAX_INLINE_BASE64 = 8_400_000;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function requireShortText(value: string, label: string, maxLength = 255) {
  const clean = value.trim();
  if (!clean || clean.length > maxLength) throw new Error(`Invalid ${label}.`);
  return clean;
}

export async function analyzeImageName(accessToken: string, base64Image: string, mimeType: string): Promise<string> {
  const user = await requireActiveMemberForToken(accessToken);
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType) || !base64Image || base64Image.length > MAX_INLINE_BASE64) {
    throw new Error("This file cannot be analyzed for naming.");
  }
  await consumeAiCredit(user.id, "document_name");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let retries = 5;
  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { text: "Analyze this document/image and provide a short, descriptive file name (without extension, max 5 words) based on its content. Only return the file name, nothing else. Do not use quotes or backticks." },
              {
                inlineData: {
                  data: base64Image,
                  mimeType: mimeType
                }
              }
            ]
          }
        ],
        config: {
          temperature: 0.2,
        }
      });

      if (!response.text) {
        throw new Error("No text returned from Gemini");
      }

      const suggestedName = response.text.trim();
      // Clean up any quotes or extra whitespace
      return suggestedName.replace(/^["']|["']$/g, '').trim();
    } catch (error: unknown) {
      const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : null;
      const message = error instanceof Error ? error.message : "";
      if (status === 503 || message.includes("503")) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1500)); // wait 1.5s
      } else {
        throw error;
      }
    }
  }
  throw new Error("AI rename failed after retries");
}

export async function enrichPasswordMetadata(accessToken: string, title: string): Promise<{ category: string, domain: string | null }> {
  await requireActiveMemberForToken(accessToken);
  title = requireShortText(title, "password title");
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant", // Fast text model
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an intelligent categorization assistant. The user will provide a service name (e.g. 'Netflix', 'Chase Bank', 'Github'). You must return a JSON object with exactly two keys: 'category' (a broad category string like 'Entertainment', 'Finance', 'Development', 'Social', 'Work', 'Shopping', 'Utilities', 'Other') and 'domain' (the primary website domain for this service, e.g. 'netflix.com', 'chase.com', 'github.com'. If you cannot guess the domain, return null). Ensure the response is valid JSON."
        },
        {
          role: "user",
          content: title
        }
      ],
      temperature: 0.1,
    })
  });

  if (!response.ok) {
    console.error("Groq API error:", await response.text());
    return { category: "Uncategorized", domain: null };
  }

  const data = await response.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      category: parsed.category || "Uncategorized",
      domain: parsed.domain || null
    };
  } catch (err) {
    console.error("Failed to parse Groq response:", err);
    return { category: "Uncategorized", domain: null };
  }
}

export async function categorizeDocument(accessToken: string, title: string): Promise<string> {
  const user = await requireActiveMemberForToken(accessToken);
  title = requireShortText(title, "document title");
  // Best-effort metering: never block a categorize call, but record the usage.
  try {
    await consumeAiCredit(user.id, "categorize");
  } catch {
    // If the allowance is exhausted we still categorize (paid plans only reach
    // documents anyway); the uncounted call is acceptable.
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "Uncategorized";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an intelligent categorization assistant. The user will provide a document filename or title. You must return a JSON object with exactly one key: 'category' (a broad category string like 'Finance', 'Identity/Legal', 'Work', 'Medical', 'Receipts', 'Personal', 'Other'). Ensure the response is valid JSON."
        },
        { role: "user", content: title }
      ],
      temperature: 0.1,
    })
  });

  if (!response.ok) return "Uncategorized";
  try {
    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.category || "Uncategorized";
  } catch {
    return "Uncategorized";
  }
}

export async function categorizeNote(accessToken: string, title: string): Promise<string> {
  await requireActiveMemberForToken(accessToken);
  title = requireShortText(title, "note title");
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "Uncategorized";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an intelligent categorization assistant. The user will provide a secure note title. You must return a JSON object with exactly one key: 'category' (a broad category string like 'Personal', 'Work', 'Ideas', 'Finance', 'Travel', 'Other'). Ensure the response is valid JSON."
        },
        { role: "user", content: title }
      ],
      temperature: 0.1,
    })
  });

  if (!response.ok) return "Uncategorized";
  try {
    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.category || "Uncategorized";
  } catch {
    return "Uncategorized";
  }
}

async function parseGlobalBulkData(rawText: string): Promise<GlobalImportResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a precise data extraction engine for a secure personal vault. The user will paste a raw text dump of all their credentials. Your job is to parse it into 9 strictly separated categories.

CATEGORY RULES - follow these EXACTLY:

1. "passwords" - Any login credential for any website/app/service/game/government portal. This includes:
   - Social media (Instagram, Facebook, Snapchat, X/Twitter)
   - Email accounts (Gmail, Outlook, Yahoo)
   - Gaming (Call of Duty, Supercell/COC)
   - Streaming/entertainment
   - Shopping (Amazon, Starbucks, Mariott)
   - Coding (Github)
   - Portals (MahaDBT, Qooh.me, MahaDMahit)
   - Apple ID, Microsoft Account
   - Bank INTERNET LOGIN credentials (Customer ID + login password for HDFC, Kotak, Federal Bank, Abhudaya etc. - these are PASSWORDS not bank accounts)
   Each password object must have: { "title": string, "url": string (domain like "instagram.com"), "username": string (email or username), "password": string (login password), "extra_details": string (any extra info like PINs, Customer ID, Recovery codes), "category": string }
   For bank login entries: title = "HDFC Bank Login", username = Customer ID, password = login password, extra_details include Login Pin, UPI Pin.
   IMPORTANT: Do NOT use the email address domain as the service URL (e.g. for Google Account, use "google.com" not "gmail.com" as URL for service but username can be the gmail address).

2. "bank_accounts" - Actual bank account records (account number, IFSC, routing). Each object: { "title": string (bank name), "account": string, "routing": string (IFSC code), "name": string, "extra_details": string (any extra info like Customer ID, UPI Pin, Login Pin etc.) }

3. "credit_cards" - Any debit OR credit card with a card number. Each object: { "title": string (e.g. "HDFC Debit Card", "Kotak Debit Card", "HDFC Credit Card"), "number": string (card number, digits only or spaced), "expiry": string (MM/YY format), "cvv": string, "name": string (cardholder name if present), "pin": string (ATM/Debit card PIN if present, else ""), "upi_pin": string (UPI PIN if present, else ""), "extra_details": string (any remaining info not captured above) }

4. "ssh_keys" - SSH key pairs (text starting with "-----BEGIN OPENSSH PRIVATE KEY-----" or similar, or "ssh-ed25519"/"ssh-rsa" public keys). Each object: { "title": string, "privateKey": string (full private key block if present, else ""), "publicKey": string (full public key line if present, else ""), "host": string (server/host it connects to, if mentioned), "passphrase": string (key passphrase if present, else "") }

5. "crypto_wallets" - Cryptocurrency seed/recovery phrases or wallet credentials. Each object: { "title": string, "seedPhrase": string (the space-separated recovery words, else ""), "walletAddress": string (0x... or bc1... address if present, else "") }

6. "api_credentials" - API keys/secrets for developer services (Stripe, AWS, OpenAI, Twilio, database connection strings, etc). Each object: { "title": string, "serviceName": string, "apiKey": string (public key/client ID), "apiSecret": string (secret key/client secret, if present) }

7. "wifi_credentials" - WiFi network names and passwords. Each object: { "title": string, "networkName": string (SSID), "password": string (network password) }

8. "two_factor_backups" - 2FA/MFA backup or recovery codes (lists of one-time-use codes for account recovery, NOT TOTP secrets). Each object: { "title": string, "serviceName": string, "codes": string (all codes, one per line) }

9. "notes" - Anything that doesn't fit cleanly into the above 8 categories. Each object: { "title": string, "content": string, "category": string }

CRITICAL RULES:
- A bank section may contain BOTH a bank login (→ passwords) AND an account number (→ bank_accounts) AND card details (→ credit_cards). Split them properly.
- HDFC Bank: the "Customer ID + Password" is a PASSWORD entry. The "Account No + IFSC" is a BANK_ACCOUNT entry. The "Debit/Credit Card number" entries are CREDIT_CARDS entries.
- If a card is labeled "Debit Card", put it in credit_cards with title saying "Debit Card".
- For each Instagram account, GitHub account, Google account etc - create ONE password entry per credential pair (multiple usernames = multiple entries).
- For Supercell/COC "Email Code" type passwords - use "Email Code" as the password value.
- For Abhudaya Bank with only PINs and no account number - create a password entry with the PINs in extra_details.
- Do NOT confuse a WiFi password with a login password, an API secret with a login password, or a crypto seed phrase with a note - use the dedicated category whenever the data clearly matches it.
- Return ONLY a valid JSON object with exactly these nine array keys: passwords, bank_accounts, credit_cards, ssh_keys, crypto_wallets, api_credentials, wifi_credentials, two_factor_backups, notes.`
        },
        {
          role: "user",
          content: rawText
        }
      ],
      temperature: 0.0,
      max_tokens: 8000,
    })
  });

  if (!response.ok) {
    console.error("Groq API error:", await response.text());
    throw new Error("Failed to parse global bulk data");
  }

  const data = await response.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return {
      passwords: parsed.passwords || [],
      notes: parsed.notes || [],
      bank_accounts: parsed.bank_accounts || [],
      credit_cards: parsed.credit_cards || [],
      ssh_keys: parsed.ssh_keys || [],
      crypto_wallets: parsed.crypto_wallets || [],
      api_credentials: parsed.api_credentials || [],
      wifi_credentials: parsed.wifi_credentials || [],
      two_factor_backups: parsed.two_factor_backups || [],
    };
  } catch (err) {
    console.error("Failed to parse AI JSON response", err);
    return { passwords: [], notes: [], bank_accounts: [], credit_cards: [], ssh_keys: [], crypto_wallets: [], api_credentials: [], wifi_credentials: [], two_factor_backups: [] };
  }
}

export async function extractGlobalImportDrafts(accessToken: string, rawText: string): Promise<ImportExtractionResponse> {
  let userId: string;
  try {
    userId = (await requireActiveMemberForToken(accessToken)).id;
  } catch {
    return { ok: false, code: "EXTRACTION_FAILED", message: "Your session has expired. Sign in again to continue." };
  }
  if (!rawText.trim()) return { ok: false, code: "INVALID_INPUT", message: "Paste some vault data before analyzing it." };
  if (rawText.length > MAX_TEXT_INPUT) return { ok: false, code: "INVALID_INPUT", message: "This import is too large. Split it into smaller batches." };
  try {
    await consumeAiCredit(userId, "import");
    const result = await parseGlobalBulkData(rawText);
    if (!isGlobalImportResult(result)) return { ok: false, code: "EXTRACTION_FAILED", message: "The extracted data did not match the expected vault format." };
    const drafts = normalizeImportResult(result, "Pasted text");
    if (!drafts.length) return { ok: false, code: "EXTRACTION_FAILED", message: "No supported vault items were detected." };
    return { ok: true, drafts };
  } catch (error) {
    if (error instanceof AiLimitReachedError) {
      return { ok: false, code: "AI_LIMIT_REACHED", message: "You've used all 5 free AI actions this month. Upgrade to Plus for unlimited AI." };
    }
    console.error("Global import extraction failed:", error);
    return { ok: false, code: "EXTRACTION_FAILED", message: "The pasted data could not be analyzed. Try a smaller batch or a different source." };
  }
}
