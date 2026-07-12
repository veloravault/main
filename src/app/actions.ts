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
