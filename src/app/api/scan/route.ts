import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { authenticateActiveMemberRequest } from "@/lib/server/auth";
import { AiLimitReachedError, consumeAiCredit } from "@/lib/server/aiUsage";
import { InvalidJsonBodyError, PayloadTooLargeError, readBoundedJson } from "@/lib/server/requestBody";

const MAX_REQUEST_BYTES = 8_500_000;
const MAX_BASE64_CHARACTERS = 8_000_000;
const ALLOWED_SCAN_TYPES = new Set(["global_import", "credit_card", "bank_account"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateActiveMemberRequest(req);
    if (!user) return badRequest("Unauthorized", 401);

    const body = await readBoundedJson(req, MAX_REQUEST_BYTES);
    const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
    const type = typeof body.type === "string" ? body.type : "";

    if (!imageBase64 || !ALLOWED_SCAN_TYPES.has(type)) {
      return NextResponse.json({ error: "Missing imageBase64 or type" }, { status: 400 });
    }

    const matches = imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!matches || !ALLOWED_IMAGE_TYPES.has(matches[1])) return badRequest("Use a JPEG, PNG, or WebP image.");
    if (matches[2].length > MAX_BASE64_CHARACTERS) return badRequest("Image is too large to scan.", 413);

    // Check the service is actually available BEFORE spending a Free-plan
    // user's monthly AI credit — otherwise a missing key burns a scan for a 503.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return badRequest("Image scanning is unavailable.", 503);

    await consumeAiCredit(user.id, "scan");

    const ai = new GoogleGenAI({ apiKey });

    const model = "gemini-3-flash-preview";

    let schema;
    let prompt;

    if (type === "global_import") {
      prompt = "Extract every password, secure note, bank account, and payment card visible in this image. Use empty strings for missing values and never invent values.";
      schema = {
        type: Type.OBJECT,
        properties: {
          passwords: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, url: { type: Type.STRING }, username: { type: Type.STRING }, password: { type: Type.STRING }, extra_details: { type: Type.STRING }, category: { type: Type.STRING } } } },
          notes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, category: { type: Type.STRING } } } },
          bank_accounts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, account: { type: Type.STRING }, routing: { type: Type.STRING }, name: { type: Type.STRING }, extra_details: { type: Type.STRING } } } },
          credit_cards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, number: { type: Type.STRING }, expiry: { type: Type.STRING }, cvv: { type: Type.STRING }, name: { type: Type.STRING }, pin: { type: Type.STRING }, upi_pin: { type: Type.STRING }, extra_details: { type: Type.STRING } } } },
        },
        required: ["passwords", "notes", "bank_accounts", "credit_cards"],
      };
    } else if (type === "credit_card") {
      prompt = "Extract the credit card details from this image. If you cannot find a value, return empty string. Do not hallucinate values. Format the card number without spaces.";
      schema = {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.STRING, description: "Card number, digits only, no spaces" },
          expiry: { type: Type.STRING, description: "Expiry date in MM/YY format" },
          cvv: { type: Type.STRING, description: "3 or 4 digit security code (CVV)" },
          name: { type: Type.STRING, description: "Cardholder name" },
        }
      };
    } else if (type === "bank_account") {
      prompt = "Extract the bank account details from this document. If you cannot find a value, return empty string. Do not hallucinate values.";
      schema = {
        type: Type.OBJECT,
        properties: {
          routing: { type: Type.STRING, description: "Routing number or IFSC code" },
          account: { type: Type.STRING, description: "Account number" },
          name: { type: Type.STRING, description: "Account holder name or institution name" },
        }
      };
    } else {
      return badRequest("Unsupported scan type.");
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No text returned from Gemini");

    const parsed = JSON.parse(resultText) as unknown;
    if (type === "global_import") return NextResponse.json({ ok: true, data: parsed });
    return NextResponse.json({ data: parsed });

  } catch (error: unknown) {
    if (error instanceof AiLimitReachedError) {
      return NextResponse.json(
        { error: "You've used all 5 AI scans this month. Upgrade to Plus for unlimited AI.", code: error.code },
        { status: 429 },
      );
    }
    if (error instanceof PayloadTooLargeError) return badRequest("Image is too large to scan.", 413);
    if (error instanceof InvalidJsonBodyError) return badRequest("Request body must be valid JSON.");
    console.error("Gemini scan failed:", error);
    return NextResponse.json({ error: "The image could not be analyzed. Try again." }, { status: 502 });
  }
}
