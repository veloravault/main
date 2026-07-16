import { NextResponse } from "next/server";
import { reconcileConfirmedInvite } from "@/lib/server/access-repository";
import { assertSameOrigin, requiredAppUrl } from "@/lib/server/request-security";
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
    assertSameOrigin(request);
    const form = await readConfirmationForm(request);
    const tokenHash = form.get("token_hash");
    if (
      form.get("type") !== "invite"
      || typeof tokenHash !== "string"
      || tokenHash.length < 20
      || tokenHash.length > 2048
    ) return redirectTo("/accept-invite?state=invalid");

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
    if (error || !data.user?.email) {
      console.error("AUTH_CONFIRM_VERIFY_OTP_FAILED", { code: error?.code, message: error?.message, status: error?.status });
      return redirectTo("/accept-invite?state=expired");
    }

    try {
      const status = await reconcileConfirmedInvite({ userId: data.user.id, email: data.user.email });
      if (status === "invited") return redirectTo("/onboarding");
      if (status === "active") return redirectTo("/vault");
      console.error("AUTH_CONFIRM_UNEXPECTED_STATUS", { userId: data.user.id, status });
      await supabase.auth.signOut();
      return redirectTo("/accept-invite?state=invalid");
    } catch (reconcileError) {
      console.error("AUTH_CONFIRM_RECONCILE_THREW", {
        userId: data.user.id,
        name: reconcileError instanceof Error ? reconcileError.name : typeof reconcileError,
        message: reconcileError instanceof Error ? reconcileError.message : String(reconcileError),
      });
      await supabase.auth.signOut();
      return redirectTo("/accept-invite?state=invalid");
    }
  } catch (outerError) {
    console.error("AUTH_CONFIRM_OUTER_CATCH", {
      name: outerError instanceof Error ? outerError.name : typeof outerError,
      message: outerError instanceof Error ? outerError.message : String(outerError),
    });
    return redirectTo("/accept-invite?state=invalid");
  }
}
