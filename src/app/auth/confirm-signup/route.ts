import { NextResponse } from "next/server";
import { provisionSelfSignupMember } from "@/lib/server/access-repository";
import { requiredAppUrl } from "@/lib/server/request-security";
import { createServerSupabaseClient } from "@/lib/server/supabase";

const MAX_CONFIRM_BYTES = 3_072;

function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, requiredAppUrl()), 303);
}

async function readConfirmationForm(request: Request) {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/x-www-form-urlencoded") throw new Error("INVALID_CONFIRMATION_FORM");
  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_CONFIRM_BYTES) {
    throw new Error("INVALID_CONFIRMATION_FORM");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_CONFIRMATION_FORM");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_CONFIRM_BYTES) {
      await reader.cancel();
      throw new Error("INVALID_CONFIRMATION_FORM");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const fields = new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if ([...fields.keys()].some((key) => key !== "token_hash" && key !== "type")) {
    throw new Error("INVALID_CONFIRMATION_FORM");
  }
  if (fields.getAll("token_hash").length !== 1 || fields.getAll("type").length !== 1) {
    throw new Error("INVALID_CONFIRMATION_FORM");
  }
  return fields;
}

export async function POST(request: Request) {
  try {
    // No assertSameOrigin here: /confirm-signup intentionally sends
    // Referrer-Policy: no-referrer (its URL carries token_hash), so this
    // form's own POST never carries a Referer, and some browsers also send
    // a literal "null" Origin on this kind of top-level navigation when the
    // page was reached from an external context (e.g. a webmail link).
    // Authorization here comes entirely from token_hash: verifyOtp only
    // succeeds for a genuine, unexpired, single-use signup token, so there
    // is no ambient session/cookie for a cross-site request to ride on.
    const form = await readConfirmationForm(request);
    const tokenHash = form.get("token_hash");
    if (
      form.get("type") !== "email"
      || typeof tokenHash !== "string"
      || tokenHash.length < 20
      || tokenHash.length > 2048
    ) return redirectTo("/confirm-signup?state=invalid");

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (error || !data.user?.email) {
      console.error("AUTH_CONFIRM_SIGNUP_VERIFY_OTP_FAILED", { code: error?.code, message: error?.message, status: error?.status });
      return redirectTo("/confirm-signup?state=expired");
    }

    try {
      await provisionSelfSignupMember({ userId: data.user.id, email: data.user.email });
      return redirectTo("/onboarding");
    } catch (provisionError) {
      console.error("AUTH_CONFIRM_SIGNUP_PROVISION_FAILED", {
        userId: data.user.id,
        name: provisionError instanceof Error ? provisionError.name : typeof provisionError,
        message: provisionError instanceof Error ? provisionError.message : String(provisionError),
      });
      await supabase.auth.signOut();
      return redirectTo("/confirm-signup?state=invalid");
    }
  } catch (outerError) {
    console.error("AUTH_CONFIRM_SIGNUP_OUTER_CATCH", {
      name: outerError instanceof Error ? outerError.name : typeof outerError,
      message: outerError instanceof Error ? outerError.message : String(outerError),
    });
    return redirectTo("/confirm-signup?state=invalid");
  }
}
