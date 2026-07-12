"use server";

export async function analyzeImageName(base64Image: string, mimeType: string): Promise<string> {
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
      model: "llama-3.2-90b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and provide a short, descriptive file name (without extension, max 5 words) based on its content. Only return the file name, nothing else. Do not use quotes or backticks."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 20
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API error:", errorText);
    throw new Error("Failed to analyze image");
  }

  const data = await response.json();
  const suggestedName = data.choices[0].message.content.trim();
  
  // Clean up any quotes or extra whitespace
  return suggestedName.replace(/^["']|["']$/g, '').trim();
}

export async function enrichPasswordMetadata(title: string): Promise<{ category: string, domain: string | null }> {
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

export async function categorizeDocument(title: string): Promise<string> {
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

export async function categorizeNote(title: string): Promise<string> {
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

export async function aiSearchVault(query: string, items: { id: string; type: string; title: string; category?: string }[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

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
          content: "You are an intelligent search assistant for a secure vault. You will be provided with a user's search query and a JSON array of their vault items (each with an id, type, title, and category). Your task is to find the single most relevant item that matches the user's query semantically. You must return a JSON object with exactly one key: 'matchedId' (the string id of the best matching item, or null if no item is a good match). Ensure the response is valid JSON."
        },
        { 
          role: "user", 
          content: JSON.stringify({ query, items }) 
        }
      ],
      temperature: 0.1,
    })
  });

  if (!response.ok) return null;
  try {
    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.matchedId || null;
  } catch {
    return null;
  }
}

export async function parseNotesToPasswords(rawText: string): Promise<any[]> {
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
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an intelligent data extraction assistant. The user will provide a messy, unstructured text note containing passwords. Your task is to extract all the credentials/passwords and return a JSON object with a single key 'passwords' containing an array of objects. Each object must have exactly the following string keys: 'title' (the service/platform name), 'url' (if a URL is provided, otherwise guess the primary domain based on the 'title', e.g., if title is 'Call of Duty', guess 'callofduty.com'. Do NOT use the email domain as the service URL unless the service itself is an email provider), 'username' (the email, username, or main identifier, if any), 'password' (the main password, if found), 'extra_details' (any extra fields like PINs, Customer IDs, Card Details, Recovery Codes, formatted clearly with line breaks), and 'category' (a broad category like 'Entertainment', 'Finance', 'Work', 'Social', 'Other'). If there is no 'password' but there are PINs or other secrets, put them in 'extra_details'. If some fields are missing, leave them as empty strings. Ensure the response is valid JSON."
        },
        {
          role: "user",
          content: rawText
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    console.error("Groq API error:", await response.text());
    throw new Error("Failed to parse notes");
  }

  const data = await response.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.passwords || [];
  } catch (err) {
    console.error("Failed to parse AI JSON response", err);
    return [];
  }
}

export async function parseBulkNotes(rawText: string): Promise<any[]> {
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
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an intelligent data extraction assistant. The user will provide a massive block of unstructured text that contains multiple distinct notes mashed together. Your task is to find the logical boundaries between these different notes and extract them into an array of distinct items. Return a JSON object with a single key 'notes' containing an array of objects. Each object must have exactly the following string keys: 'title' (a short, generated title for the note), 'content' (the actual text content of the note), and 'category' (a broad category like 'Personal', 'Work', 'Ideas', 'Finance', 'Travel', 'Other'). Ensure the response is valid JSON."
        },
        {
          role: "user",
          content: rawText
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    console.error("Groq API error:", await response.text());
    throw new Error("Failed to parse bulk notes");
  }

  const data = await response.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return parsed.notes || [];
  } catch (err) {
    console.error("Failed to parse AI JSON response", err);
    return [];
  }
}

export type GlobalImportResult = {
  passwords: any[];
  notes: any[];
  bank_accounts: any[];
  credit_cards: any[];
};

export async function parseGlobalBulkData(rawText: string): Promise<GlobalImportResult> {
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
          content: `You are a precise data extraction engine for a secure personal vault. The user will paste a raw text dump of all their credentials. Your job is to parse it into 4 strictly separated categories.

CATEGORY RULES — follow these EXACTLY:

1. "passwords" — Any login credential for any website/app/service/game/government portal. This includes:
   - Social media (Instagram, Facebook, Snapchat, X/Twitter)
   - Email accounts (Gmail, Outlook, Yahoo)
   - Gaming (Call of Duty, Supercell/COC)
   - Streaming/entertainment
   - Shopping (Amazon, Starbucks, Mariott)
   - Coding (Github)
   - Portals (MahaDBT, Qooh.me, MahaDMahit)
   - Apple ID, Microsoft Account
   - Bank INTERNET LOGIN credentials (Customer ID + login password for HDFC, Kotak, Federal Bank, Abhudaya etc. — these are PASSWORDS not bank accounts)
   Each password object must have: { "title": string, "url": string (domain like "instagram.com"), "username": string (email or username), "password": string (login password), "extra_details": string (any extra info like PINs, Customer ID, Recovery codes), "category": string }
   For bank login entries: title = "HDFC Bank Login", username = Customer ID, password = login password, extra_details include Login Pin, UPI Pin.
   IMPORTANT: Do NOT use the email address domain as the service URL (e.g. for Google Account, use "google.com" not "gmail.com" as URL for service but username can be the gmail address).
   
2. "bank_accounts" — Actual bank account records (account number, IFSC, routing). Each object: { "title": string (bank name), "account": string, "routing": string (IFSC code), "name": string, "extra_details": string (any extra info like Customer ID, UPI Pin, Login Pin etc.) }

3. "credit_cards" — Any debit OR credit card with a card number. Each object: { "title": string (e.g. "HDFC Debit Card", "Kotak Debit Card", "HDFC Credit Card"), "number": string (card number, digits only or spaced), "expiry": string (MM/YY format), "cvv": string, "name": string (cardholder name if present), "pin": string (ATM/Debit card PIN if present, else ""), "upi_pin": string (UPI PIN if present, else ""), "extra_details": string (any remaining info not captured above) }

4. "notes" — Anything that doesn't fit cleanly into the above 3 categories. Each object: { "title": string, "content": string, "category": string }

CRITICAL RULES:
- A bank section may contain BOTH a bank login (→ passwords) AND an account number (→ bank_accounts) AND card details (→ credit_cards). Split them properly.
- HDFC Bank: the "Customer ID + Password" is a PASSWORD entry. The "Account No + IFSC" is a BANK_ACCOUNT entry. The "Debit/Credit Card number" entries are CREDIT_CARDS entries.
- If a card is labeled "Debit Card", put it in credit_cards with title saying "Debit Card".
- For each Instagram account, GitHub account, Google account etc — create ONE password entry per credential pair (multiple usernames = multiple entries).
- For Supercell/COC "Email Code" type passwords — use "Email Code" as the password value.
- For Abhudaya Bank with only PINs and no account number — create a password entry with the PINs in extra_details.
- Return ONLY a valid JSON object with exactly these four array keys: passwords, bank_accounts, credit_cards, notes.`
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
    };
  } catch (err) {
    console.error("Failed to parse AI JSON response", err);
    return { passwords: [], notes: [], bank_accounts: [], credit_cards: [] };
  }
}
