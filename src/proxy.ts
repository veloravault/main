import type { NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/server/session-proxy";

const CSP_REPORT_ENDPOINT = "csp-endpoint";
const CSP_REPORT_PATH = "/api/csp-report";

function buildCsp(nonce: string) {
  // Next.js dev mode (React DevTools, HMR, RSC stack-trace reconstruction)
  // relies on eval(); production never needs it, so keep the tighter policy there.
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `'self' 'nonce-${nonce}'`
      : `'self' 'nonce-${nonce}' 'unsafe-eval'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc} https://checkout.razorpay.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://unavatar.io https://*.razorpay.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.razorpay.com https://*.r2.cloudflarestorage.com",
    "frame-src 'self' blob: https://checkout.razorpay.com https://api.razorpay.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Legacy directive for browsers that don't yet support report-to.
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_ENDPOINT}`,
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csp-nonce", nonce);

  const response = await refreshSupabaseSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set(
    "Reporting-Endpoints",
    `${CSP_REPORT_ENDPOINT}="${CSP_REPORT_PATH}"`,
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
