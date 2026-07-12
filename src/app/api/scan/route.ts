import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : "Failed to scan image";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, type } = await req.json();
    
    if (!imageBase64 || !type) {
      return NextResponse.json({ error: "Missing imageBase64 or type" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const model = "gemini-2.5-flash"; 
    
    let schema;
    let prompt;

    if (type === "credit_card") {
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
    } else {
      prompt = "Extract the bank account details from this document. If you cannot find a value, return empty string. Do not hallucinate values.";
      schema = {
        type: Type.OBJECT,
        properties: {
          routing: { type: Type.STRING, description: "Routing number or IFSC code" },
          account: { type: Type.STRING, description: "Account number" },
          name: { type: Type.STRING, description: "Account holder name or institution name" },
        }
      };
    }

    // Split base64 to get MIME type and pure base64 data
    const matches = imageBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

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

    return NextResponse.json({ data: JSON.parse(resultText) });
    
  } catch (err: unknown) {
    console.error("Gemini API Error:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
